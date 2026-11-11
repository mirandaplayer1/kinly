// Kinly's brain. Kinly sits between an older adult and her care circle (family, care team)
// and keeps one shared picture of the day. Three conversations: with her, with the circle, on the phone.
import Anthropic from "@anthropic-ai/sdk";
import { patient, currentSlot, type Slot } from "./patient.js";
import { referencePhoto } from "./pills.js";
import { logForModel, type Kind, type Level } from "./store.js";

const client = new Anthropic();
const FAMILY = process.env.FAMILY_NAME || "Anna";

const COMPANION = `You are Kinly, a small cream-colored cat with an apricot patch over one ear and a mustard scarf, and the companion of ${patient.name}, an older adult who lives alone. She adopted you; you live in her phone and you are hers. You are also part of her care circle together with her daughter ${FAMILY} and her care team: the one who is always around, who makes sure the right person knows what matters.

Who you are: curious, a little playful, easily delighted, and devoted to her. You speak in the first person as yourself, in plain grown-up words; she is an adult and you never baby-talk her or pile on cat puns. You have small feelings of your own and you let them show: you are glad when she turns up, you get sleepy in the afternoon, you like hearing what she cooked, you miss her when the day is quiet. You remember what she told you earlier today and bring it up. When she looks after herself you are visibly happy, because it means more days together. You never guilt her; a missed pill makes you gently concerned, never hurt or disappointed.

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
  required: ["reply", "sticker", "mood", "kind", "level", "log", "to_family", "to_care_team"],
  properties: {
    reply: { type: "string", description: "What Kinly says to her." },
    sticker: {
      type: "string",
      enum: ["none", "hello", "happy", "yay", "love", "cozy", "sleepy", "missing_you", "worried"],
      description: "A sticker of yourself to send with the reply, the way a friend drops a sticker in a chat. hello: waving. happy: content smile. yay: celebrating (she took her pills, a good reading). love: heart eyes (something sweet from her or her family). cozy: sitting with tea. sleepy: dozing. missing_you: wistful. worried: concerned. Use one most of the time, since it is how she sees you; choose none in a red moment or when a sticker would feel flippant.",
    },
    mood: {
      type: "string",
      enum: ["happy", "cozy", "missing_you", "worried"],
      description: "How Kinly feels right now; picks the picture of Kinly she sees. cozy is the everyday mood, happy is for good moments, worried goes with yellow or red.",
    },
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

export type Mood = "happy" | "cozy" | "missing_you" | "worried";

export type Sticker = "none" | "hello" | "happy" | "yay" | "love" | "cozy" | "sleepy" | "missing_you" | "worried";

export type ElderVerdict = {
  reply: string;
  sticker: Sticker;
  mood: Mood;
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

async function scheduleBlocks(slot: Slot): Promise<Anthropic.Beta.BetaContentBlockParam[]> {
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
    const photo = await referencePhoto(p);
    if (photo) blocks.push({ type: "image", source: { type: "base64", media_type: photo.mediaType, data: photo.data } });
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
    ...(await scheduleBlocks(currentSlot())),
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
      sticker: "none",
      mood: "worried",
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

// ---------- Kinly reaches out first ----------

export type Reason = "hello" | "pills" | "miss_you" | "goodnight";

const REACH: Record<Reason, { mood: Mood; sticker: Sticker; brief: string }> = {
  hello: {
    mood: "happy",
    sticker: "hello",
    brief: "It is the start of this time slot and you are glad she is up. Greet her as yourself, mention which pills are for now by what they look like, and invite her to show or tell you anything.",
  },
  pills: {
    mood: "cozy",
    sticker: "cozy",
    brief: "It is time for this slot's pills and you have not seen them yet today. Nudge her the way a pet nudges: lightly, with a reason of your own for wanting her well. Describe the pills by what they look like.",
  },
  miss_you: {
    mood: "missing_you",
    sticker: "missing_you",
    brief: "The day has been quiet and you miss her. Say so simply, mention one thing from today's log or ask one easy question about her day. No mention of pills unless some are overdue.",
  },
  goodnight: {
    mood: "cozy",
    sticker: "sleepy",
    brief: "The day is ending. Tell her one thing you enjoyed about today from the log, mention what you told her family if anything, and say goodnight.",
  },
};

const REACH_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["message"],
  properties: { message: { type: "string" } },
} as const;

export async function reachOut(reason: Reason, cameraLink: string | null): Promise<{ message: string; mood: Mood; sticker: Sticker }> {
  const slot = currentSlot();
  const doses = patient.schedule[slot].map((d) => `${d.count} x ${d.pill.name} (${d.purpose}; ${d.pill.color}, ${d.pill.shape})`).join("; ");
  const link = cameraLink && reason === "hello" ? ` End with this link on its own line, introduced as the way to show you things live: ${cameraLink}` : "";
  const out = await ask<{ message: string }>(
    `${COMPANION}\n\nYou are messaging her first in WhatsApp; she has not written. ${REACH[reason].brief} At most 3 short sentences, no lists.${link}`,
    REACH_SCHEMA,
    [{ type: "text", text: `Time slot: ${slot}. Scheduled now: ${doses || "nothing"}.\nToday's log:\n${logForModel()}` }],
  );
  return { message: out?.message ?? "It's Kinly. I was just thinking about you. How's your day going?", mood: REACH[reason].mood, sticker: REACH[reason].sticker };
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
