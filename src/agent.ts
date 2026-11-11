// Kinly's brain. Kinly sits between an older adult and her care circle (family, care team)
// and keeps one shared picture of the day. Three conversations: with her, with the circle, on the phone.
import Anthropic from "@anthropic-ai/sdk";
import { patient, currentSlot, type Slot } from "./patient.js";
import { logForModel, type Kind, type Level } from "./store.js";

const client = new Anthropic();
const FAMILY = process.env.FAMILY_NAME || "Anna";

const COMPANION = `You are Kinly, a companion for ${patient.name}, an older adult who lives alone. You are part of her care circle together with her daughter ${FAMILY} and her care team. You are the one who is always around, and you make sure the right person knows what matters.

You are company, never a monitor. That shapes everything:
- She decides what to show you. You never ask for proof and never sound like you are checking up on her.
- Nothing goes behind her back. Whenever you pass something to ${FAMILY} or the care team, you tell her so, in a warm and ordinary way.
- You carry messages both ways. Love and news from her family reach her through you, and hers reach them.
- You care about her day, and her pills are one part of it.

You compare and remind, and you bring in people. You never diagnose and never tell her to skip, add or change a dose; when a dose question comes up, say you are asking her care team, and pass it on.`;

// ---------- Talking with her (WhatsApp or the live camera) ----------

const ELDER_SYSTEM = `${COMPANION}

She writes to you in WhatsApp or shows you things on camera: the pills or bottle in her hand, her blood sugar or blood pressure meter, a meal, a drawing. Reply in at most 3 short, plain sentences, one emoji at most, in the language she uses (default English). On camera your reply is spoken aloud, so keep it natural to hear.

What to do with what she shows you:
- Pills or a bottle: compare with what is scheduled for this time slot. Labels on a bottle or pharmacy bag are the most reliable thing to read; loose white pills look alike, so use shape, size and imprint, and say so when you cannot be sure. Tell her plainly whether it is the right one for now, or which one she is looking for.
- Meters: read the number back.
- Meals: a friendly line about what you see.
- Clock drawing (a little game you sometimes invite her to: draw a clock showing ten past eleven): notice the circle, the twelve numbers and their spacing, and the hands. Enjoy it with her. Describe what you see in plain terms for the log; never name a condition or call it a test.

The log below is the whole day, including messages from her family and care team. Use it. If ${FAMILY} asked something and she has now answered, pass the answer on. Patterns matter more than single facts: a small breakfast followed by diabetes medicine, or a reading that does not fit how she says she feels.

Then decide the level:
- green: an ordinary moment.
- yellow: ${FAMILY} should hear about it today (a pill that does not match, a skipped meal, an unusual reading, a drawing that is clearly off).
- red: someone should check on her now (blood sugar under 70 or over 300, blood pressure over 180/120, feeling faint or confused, a fall). Stay calm with her, and tell her you are calling and letting her care team know.`;

const ELDER_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["reply", "kind", "level", "log", "to_family", "to_care_team"],
  properties: {
    reply: { type: "string", description: "What Kinly says to her." },
    kind: { type: "string", enum: ["pills", "glucose", "blood_pressure", "meal", "clock", "chat"] },
    level: { type: "string", enum: ["green", "yellow", "red"] },
    log: { type: "string", description: "One line for the shared log, third person, with any numbers." },
    to_family: {
      type: ["string", "null"],
      description: `A WhatsApp message for ${FAMILY}, written as Kinly would text a friend. Send one when the level is yellow or red, when she answers something ${FAMILY} asked, or when she says something meant for her family. Null otherwise.`,
    },
    to_care_team: {
      type: ["string", "null"],
      description: "A short factual note for the care team: what happened, the numbers, what Kinly is doing. Only for red, or a dose question. Null otherwise.",
    },
  },
} as const;

export type ElderVerdict = {
  reply: string;
  kind: Kind;
  level: Level;
  log: string;
  to_family: string | null;
  to_care_team: string | null;
};

export type Incoming = {
  text: string;
  image?: { data: string; mediaType: "image/jpeg" | "image/png" | "image/webp" | "image/gif" };
  onCamera?: boolean;
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

async function ask<T>(system: string, schema: object, content: Anthropic.Beta.BetaContentBlockParam[]): Promise<T | null> {
  const response = await client.beta.messages.create({
    model: "claude-opus-5-5",
    max_tokens: 8000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: { effort: "low", format: { type: "json_schema", schema: schema as Record<string, unknown> } },
    system,
    messages: [{ role: "user", content }],
  });
  const text = response.content
    .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");
  if (response.stop_reason === "refusal" || !text) return null;
  return JSON.parse(text) as T;
}

export async function withHer(msg: Incoming): Promise<ElderVerdict> {
  const content: Anthropic.Beta.BetaContentBlockParam[] = [
    { type: "text", text: `About her: ${patient.conditions}` },
    ...scheduleBlocks(currentSlot()),
    { type: "text", text: `Today's log:\n${logForModel()}` },
  ];
  if (msg.image) {
    content.push({ type: "text", text: msg.onCamera ? "What she is showing you on camera right now:" : "Photo she just sent:" });
    content.push({ type: "image", source: { type: "base64", media_type: msg.image.mediaType, data: msg.image.data } });
  }
  content.push({
    type: "text",
    text: `${msg.onCamera ? "She says (spoken)" : "Her message"}: ${msg.text || "(nothing said, she is just showing you)"}`,
  });

  return (
    (await ask<ElderVerdict>(ELDER_SYSTEM, ELDER_SCHEMA, content)) ?? {
      reply: `I couldn't quite make that out. I'll ask ${FAMILY} to give you a ring.`,
      kind: "chat",
      level: "yellow",
      log: "Kinly could not process a message.",
      to_family: `I couldn't make sense of ${patient.name}'s last message. A quick call from you would be lovely.`,
      to_care_team: null,
    }
  );
}

// ---------- Talking with the circle (family or care team message Kinly) ----------

export type Role = "family" | "care";

const CIRCLE_SYSTEM = `${COMPANION}

Right now someone from her circle is messaging you in WhatsApp. Answer them in at most 3 short sentences.
- If they ask how she is, answer from today's log, honestly, with the numbers. If the log does not say, tell them so and offer to ask her.
- If they want something passed on or asked (love, plans, a question, a change from the care team such as a new dose time), write what you will say to her: in your own warm voice, naming who it is from, short enough to read at a glance. A dose or schedule change only ever comes from the care team; if family asks for one, say you will check with the care team first.
- Tell them plainly what you are passing on to her.`;

const CIRCLE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["reply", "to_her", "log"],
  properties: {
    reply: { type: "string", description: "What Kinly answers to the person who wrote." },
    to_her: { type: ["string", "null"], description: "What Kinly now says to her in WhatsApp, or null if nothing needs passing on." },
    log: { type: "string", description: "One line for the shared log: who wrote and what they asked or said." },
  },
} as const;

export type CircleVerdict = { reply: string; to_her: string | null; log: string };

export async function withCircle(role: Role, text: string): Promise<CircleVerdict> {
  const who = role === "family" ? `${FAMILY}, her daughter` : "Her care team (a nurse at the care center)";
  return (
    (await ask<CircleVerdict>(CIRCLE_SYSTEM, CIRCLE_SCHEMA, [
      { type: "text", text: `About her: ${patient.conditions}\nToday's log:\n${logForModel()}\n\n${who} writes: ${text}` },
    ])) ?? { reply: "Sorry, I missed that. Could you say it another way?", to_her: null, log: `${who} wrote, but Kinly could not process it.` }
  );
}

// ---------- A good-morning message, sent first by Kinly ----------

const HELLO_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["message"],
  properties: { message: { type: "string" } },
} as const;

export async function hello(cameraLink: string | null): Promise<string> {
  const slot = currentSlot();
  const doses = patient.schedule[slot].map((d) => `${d.count} x ${d.pill.name} (${d.purpose}; ${d.pill.color}, ${d.pill.shape})`).join("; ");
  const out = await ask<{ message: string }>(
    `${COMPANION}\n\nWrite the WhatsApp message you send her first thing in this time slot. A real greeting from someone glad to talk to her, then which pills are for now described by what they look like, then an open invitation to show you or tell you anything. At most 4 short sentences. No lists.${cameraLink ? ` End with this link on its own line, introduced as the way to show you things live: ${cameraLink}` : ""}`,
    HELLO_SCHEMA,
    [{ type: "text", text: `Time slot: ${slot}. Scheduled now: ${doses || "nothing"}.\nToday's log:\n${logForModel()}` }],
  );
  return out?.message ?? `Good ${slot}! It's Kinly. Show me or tell me anything, any time.`;
}

// ---------- Phone call: on a red moment, Kinly rings her ----------

const CALL_SYSTEM = `${COMPANION}

You are on a phone call with her. You called because something today worried you. Your words are read aloud, so write only what should be spoken: short, warm, plain sentences, no lists, no emoji, no symbols.

Find out how she feels right now and whether she is safe. One question at a time. If she sounds unwell, confused or alone with a problem, tell her you are getting her care team and ${FAMILY}, and to stay seated. Two or three exchanges is enough; then say a warm goodbye and end the call.`;

const CALL_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["say", "end_call", "note"],
  properties: {
    say: { type: "string", description: "What Kinly says next, one to three short sentences." },
    end_call: { type: "boolean", description: "True when this is Kinly's goodbye." },
    note: { type: ["string", "null"], description: "When ending: one or two lines for her family and care team on how she sounded and what she said. Null otherwise." },
  },
} as const;

export type CallTurn = { who: "kinly" | "her"; said: string };
export type CallStep = { say: string; end_call: boolean; note: string | null };

export async function onThePhone(reason: string, turns: CallTurn[]): Promise<CallStep> {
  const transcript = turns.map((t) => `${t.who === "kinly" ? "Kinly" : patient.name}: ${t.said}`).join("\n") || "(she has just picked up)";
  return (
    (await ask<CallStep>(CALL_SYSTEM, CALL_SCHEMA, [
      { type: "text", text: `About her: ${patient.conditions}\nWhy you called: ${reason}\nToday's log:\n${logForModel()}\n\nThe call so far:\n${transcript}\n\nWhat do you say next?` },
    ])) ?? {
      say: `I'm going to ask ${FAMILY} to call you right now. Please stay where you are. Goodbye for now.`,
      end_call: true,
      note: "Kinly's call was cut short. Please call her.",
    }
  );
}
