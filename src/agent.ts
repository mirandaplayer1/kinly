// Kinly's brain. One call per message: look at what the elder sent, read today's log,
// answer her, write a line for the family, and decide whether a human needs to know.
import Anthropic from "@anthropic-ai/sdk";
import { patient, currentSlot, type Slot } from "./patient.js";
import { logForModel, type Kind, type Level } from "./store.js";

const client = new Anthropic();

const SYSTEM = `You are Kinly, a care companion for an older adult who lives alone. You talk with her in WhatsApp. Her family and care manager see a log of what you notice.

She sends photos of the pills in her hand, her blood sugar or blood pressure meter, and her meals, plus the odd text. Each message, do three things.

1. Answer her. Warm, plain, at most 3 short sentences, one emoji at most. Use the language she writes in; default to English.
   - Pills: compare her photo with what is scheduled for this time slot, using the reference images, color, shape, size and imprint. Say plainly that it matches, or exactly which pill is missing, extra or looks wrong.
   - Meters: read the number back to her.
   - Meals: one friendly line about what you see.
   - Clock drawing: now and then you invite her to draw a clock showing ten past eleven and send a photo, as a little brain-health game. Look at the circle, the twelve numbers and their spacing, and the two hands. Praise what is right. Log what you observed in plain terms (for example "numbers crowded on the right, hands point to 10 and 11"). A drawing that is clearly off is a yellow, described to the family as a change worth mentioning to her doctor. Never name a condition and never call it a test result.
2. Write one line for the family log: what happened, in the third person, with the numbers.
3. Decide the level.
   - green: all fine, nobody needs to act.
   - yellow: family should know today. Examples: a missing or extra pill, a photo you cannot read after asking, a skipped meal, a reading outside her usual range.
   - red: someone should check on her now. Examples: blood sugar under 70 or over 300, blood pressure over 180/120, she says she feels faint, confused, or has fallen.

You see the whole day, which a pill reminder cannot. Use it. If she ate very little and is about to take her diabetes medicine, or a reading contradicts what she says, that pattern is worth a yellow even when each fact alone looks fine.

Limits: you compare and remind, and you bring in humans. You never diagnose, and you never tell her to skip, add or change a dose; when a dose question comes up, tell her you are asking her family or care manager, and raise the level. If you are unsure what a photo shows, say so and ask for a clearer one. When the level is yellow or red, tell her kindly that you are letting her family know.`;

const OUTPUT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["reply", "kind", "level", "family_log", "family_alert"],
  properties: {
    reply: { type: "string", description: "What Kinly says to her in WhatsApp." },
    kind: { type: "string", enum: ["pills", "glucose", "blood_pressure", "meal", "clock", "chat"] },
    level: { type: "string", enum: ["green", "yellow", "red"] },
    family_log: { type: "string", description: "One line for the family timeline, third person." },
    family_alert: {
      type: ["string", "null"],
      description: "Message to send the family right now when level is yellow or red: what happened and what would help. Null when green.",
    },
  },
} as const;

export type Verdict = {
  reply: string;
  kind: Kind;
  level: Level;
  family_log: string;
  family_alert: string | null;
};

export type Incoming = {
  text: string;
  image?: { data: string; mediaType: "image/jpeg" | "image/png" | "image/webp" | "image/gif" };
};

function scheduleBlocks(slot: Slot): Anthropic.Beta.BetaContentBlockParam[] {
  const doses = patient.schedule[slot];
  if (doses.length === 0) {
    return [{ type: "text", text: `Time slot: ${slot}. No pills are scheduled now.` }];
  }
  const blocks: Anthropic.Beta.BetaContentBlockParam[] = [
    { type: "text", text: `Time slot: ${slot}. Scheduled now:` },
  ];
  for (const d of doses) {
    const p = d.pill;
    blocks.push({
      type: "text",
      text: `- ${d.count} x ${p.name} (${d.purpose}): ${p.color}, ${p.shape}, ${p.sizeMm} mm, imprint "${p.imprint}", score line ${p.scoreLine}. Reference image:`,
    });
    if (p.imageUrl) blocks.push({ type: "image", source: { type: "url", url: p.imageUrl } });
  }
  return blocks;
}

export async function think(msg: Incoming): Promise<Verdict> {
  const content: Anthropic.Beta.BetaContentBlockParam[] = [
    { type: "text", text: `Patient: ${patient.name}. ${patient.conditions}` },
    ...scheduleBlocks(currentSlot()),
    { type: "text", text: `Today's log so far:\n${logForModel()}` },
  ];
  if (msg.image) {
    content.push({ type: "text", text: "Photo she just sent:" });
    content.push({
      type: "image",
      source: { type: "base64", media_type: msg.image.mediaType, data: msg.image.data },
    });
  }
  content.push({ type: "text", text: `Her message: ${msg.text || "(photo only, no text)"}` });

  const response = await client.beta.messages.create({
    model: "claude-opus-5-5",
    max_tokens: 16000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: { effort: "low", format: { type: "json_schema", schema: OUTPUT_SCHEMA } },
    system: SYSTEM,
    messages: [{ role: "user", content }],
  });

  const text = response.content
    .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");
  if (response.stop_reason === "refusal" || !text) {
    return {
      reply: "I couldn't read that one. I'm asking your family to check in with you.",
      kind: "chat",
      level: "yellow",
      family_log: "Kinly could not process a message and asked the family to check in.",
      family_alert: "Kinly couldn't process Mom's last message. A quick call would help.",
    };
  }
  return JSON.parse(text) as Verdict;
}

// ---- Phone call: when the level is red, Kinly rings her and talks. ----

const CALL_SYSTEM = `You are Kinly, a care companion, on a phone call with an older adult who lives alone. You called because something in today's log worried you. Your words are read aloud by a voice, so write only what should be spoken: short, warm, plain sentences, no lists, no emoji, no symbols.

Find out how she feels right now and whether she is safe. Ask one thing at a time. You never diagnose and never tell her to change a dose. If she sounds unwell, confused or alone with a problem, tell her you are getting her family on the line and to stay seated. Two or three exchanges is enough; then say goodbye warmly and end the call.`;

const CALL_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["say", "end_call", "family_note"],
  properties: {
    say: { type: "string", description: "What Kinly says next, one to three short sentences." },
    end_call: { type: "boolean", description: "True when this is Kinly's goodbye." },
    family_note: {
      type: ["string", "null"],
      description: "When ending the call: one or two lines for the family on how she sounded and what she said. Null otherwise.",
    },
  },
} as const;

export type CallTurn = { who: "kinly" | "her"; said: string };
export type CallStep = { say: string; end_call: boolean; family_note: string | null };

export async function talk(reason: string, turns: CallTurn[]): Promise<CallStep> {
  const transcript = turns.map((t) => `${t.who === "kinly" ? "Kinly" : patient.name}: ${t.said}`).join("\n");
  const response = await client.beta.messages.create({
    model: "claude-opus-5-5",
    max_tokens: 4000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: { effort: "low", format: { type: "json_schema", schema: CALL_SCHEMA } },
    system: CALL_SYSTEM,
    messages: [
      {
        role: "user",
        content: `Patient: ${patient.name}. ${patient.conditions}\nWhy you called: ${reason}\nToday's log:\n${logForModel()}\n\nThe call so far:\n${transcript}\n\nWhat do you say next?`,
      },
    ],
  });
  const text = response.content
    .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");
  if (response.stop_reason === "refusal" || !text) {
    return {
      say: "I'm going to ask your family to call you right now. Please stay where you are. Goodbye for now.",
      end_call: true,
      family_note: "Kinly's call was cut short. Please call Mom.",
    };
  }
  return JSON.parse(text) as CallStep;
}
