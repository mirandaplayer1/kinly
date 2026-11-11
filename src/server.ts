// Kinly's switchboard: chat with her and her care circle (Telegram or WhatsApp), the live camera page,
// the phone call on a red moment, and the family page.
import "dotenv/config";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import express from "express";
import twilio from "twilio";
import { withHer, withCircle, reachOut, onThePhone, type Incoming, type CallTurn, type Role, type ElderVerdict, type Mood, type Reason, type Sticker } from "./agent.js";
import { addEvent, todaysEvents } from "./store.js";
import { FAMILY_PAGE } from "./family.js";
import { SEE_PAGE } from "./see.js";
import { telegramOn, tgText, tgPicture, tgSticker, tgListen } from "./telegram.js";

const {
  TWILIO_ACCOUNT_SID,
  TWILIO_AUTH_TOKEN,
  TWILIO_WHATSAPP_FROM,
  TWILIO_VOICE_FROM, // a Twilio phone number, e.g. +15551234567. Without it Kinly does not call.
  PUBLIC_URL, // the ngrok https URL: needed for WhatsApp pictures, calls, and the camera link
  ELDER_WHATSAPP, // her address: "whatsapp:+886..." or "tg:<chat id>". If unset, the first person to write is her.
  FAMILY_WHATSAPP_TO,
  CARE_WHATSAPP_TO,
  QUIET_MINUTES, // if set, Kinly says "I miss you" after this many quiet minutes
  PORT = "3000",
} = process.env;

const twilioOn = Boolean(TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN && TWILIO_WHATSAPP_FROM);
if (!twilioOn && !telegramOn) throw new Error("Set TELEGRAM_BOT_TOKEN, or the three TWILIO_ values, in .env");
const tw = twilioOn ? twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN) : undefined;
const VOICE = "Polly.Joanna-Neural";
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"] as const;
type ImageType = (typeof IMAGE_TYPES)[number];

// With Telegram on, a WhatsApp address left in .env is ignored until she writes from Telegram.
// Her address is remembered across restarts in .kinly-elder (not committed).
const remembered = existsSync(".kinly-elder") ? readFileSync(".kinly-elder", "utf8").trim() : undefined;
let elder: string | undefined = remembered || (telegramOn && !ELDER_WHATSAPP?.startsWith("tg:") ? undefined : ELDER_WHATSAPP);
let mood: Mood = "cozy"; // how Kinly feels right now
let shownMood: Mood | undefined; // the last picture of Kinly she was sent
let lastHeard = Date.now(); // when she last wrote or showed something
let missedHer = false; // one "I miss you" per quiet stretch

// One way to send, whichever channel the address belongs to.
async function send(to: string, body: string, picture?: Mood) {
  if (to.startsWith("tg:")) {
    return picture ? tgPicture(to, body, `pet/${picture}.png`) : tgText(to, body);
  }
  if (!tw) throw new Error(`No WhatsApp channel configured for ${to}`);
  const mediaUrl = picture && PUBLIC_URL ? [`${PUBLIC_URL}/pet/${picture}.png`] : undefined;
  return tw.messages.create({ from: TWILIO_WHATSAPP_FROM, to, body, mediaUrl });
}

// With one phone, family and care-team messages land in the same chat, labelled, so every route is visible.
const toFamily = async (body: string) => { const to = FAMILY_WHATSAPP_TO || elder; if (to) await send(to, body); };
const toCare = async (body: string) => { const to = CARE_WHATSAPP_TO || FAMILY_WHATSAPP_TO || elder; if (to) await send(to, body); };

// To her, Kinly has a face. In Telegram that is a sticker dropped before the words; in WhatsApp,
// a picture that goes along when Kinly's mood changes.
async function sayToHer(body: string, feeling: Mood, sticker: Sticker = "none") {
  if (!elder) return;
  mood = feeling;
  if (elder.startsWith("tg:")) {
    if (sticker !== "none") await tgSticker(elder, `pet/sticker_${sticker}.webp`).catch(console.error);
    await send(elder, body);
    return;
  }
  const picture = sticker !== "none" && feeling !== shownMood ? feeling : undefined;
  if (picture) shownMood = feeling;
  await send(elder, body, picture);
}

async function reach(reason: Reason) {
  const out = await reachOut(reason, PUBLIC_URL ? `${PUBLIC_URL}/see` : null);
  shownMood = undefined;
  await sayToHer(out.message, out.mood, out.sticker);
  console.log(`-> her (${reason}): ${out.message}`);
  return out.message;
}

// Who is writing? Known addresses first; a "family:" or "care:" prefix lets one phone play every part.
function roleOf(from: string, text: string): { role: "elder" | Role; text: string } {
  const m = text.match(/^\s*(family|care)\s*:\s*/i);
  if (m) return { role: m[1].toLowerCase() as Role, text: text.slice(m[0].length) };
  if (from === FAMILY_WHATSAPP_TO) return { role: "family", text };
  if (from === CARE_WHATSAPP_TO) return { role: "care", text };
  return { role: "elder", text };
}

// ---------- Her side: one path for chat and the camera ----------

async function herMoment(msg: Incoming): Promise<ElderVerdict> {
  lastHeard = Date.now();
  missedHer = false;
  const v = await withHer(msg);
  if (msg.onCamera) mood = v.mood;
  console.log(`-> her [${v.level}/${v.mood}] ${v.reply}`);
  addEvent({
    kind: v.kind,
    level: v.level,
    summary: v.log,
    photo: msg.image ? `data:${msg.image.mediaType};base64,${msg.image.data}` : undefined,
  });
  // Routing: each person hears only what is theirs to act on.
  if (v.to_family) {
    const tag = v.level === "red" ? "🔴 " : v.level === "yellow" ? "🟡 " : "";
    await toFamily(`${tag}Kinly → family\n${v.to_family}`);
  }
  if (v.to_care_team) await toCare(`${v.level === "red" ? "🔴 " : ""}Kinly → care team\n${v.to_care_team}`);
  if (v.level === "red") await ringHer(v.log);
  return v;
}

// A message from anyone in the circle, on any channel.
async function onMessage(from: string, rawText: string, image?: Incoming["image"]) {
  const { role, text } = roleOf(from, rawText);
  console.log(`<- ${role} ${from}: ${text || "(photo)"}`);
  try {
    if (role === "elder") {
      if (!elder) writeFileSync(".kinly-elder", (elder = from));
      const v = await herMoment({ text, image });
      await sayToHer(v.reply, v.mood, v.sticker);
      return;
    }
    const c = await withCircle(role, text);
    addEvent({ kind: role, level: "green", summary: c.log });
    await send(from, `Kinly → ${role === "family" ? "family" : "care team"}\n${c.reply}`);
    console.log(`-> ${role}: ${c.reply}`);
    if (c.to_her && elder) {
      await sayToHer(c.to_her, role === "family" ? "happy" : "cozy", role === "family" ? "love" : "cozy");
      console.log(`-> her (passed on): ${c.to_her}`);
    }
  } catch (err) {
    console.error(err);
    await send(from, "Sorry, something went wrong on my side. Please send it again.").catch(() => {});
  }
}

// ---------- Phone call (Twilio voice) ----------

type Call = { reason: string; turns: CallTurn[] };
const calls = new Map<string, Call>();
const MAX_HER_TURNS = 3;

async function ringHer(reason: string) {
  if (!tw || !TWILIO_VOICE_FROM || !PUBLIC_URL || !elder?.startsWith("whatsapp:")) return;
  const call = await tw.calls.create({ to: elder.replace("whatsapp:", ""), from: TWILIO_VOICE_FROM, url: `${PUBLIC_URL}/voice` });
  calls.set(call.sid, { reason, turns: [] });
  console.log(`=> calling her (${call.sid})`);
}

async function callStep(req: express.Request, res: express.Response) {
  const call = calls.get(req.body.CallSid);
  const vr = new twilio.twiml.VoiceResponse();
  if (!call) {
    vr.say({ voice: VOICE }, "Sorry, I lost my place. I'll message you instead. Goodbye.");
    return res.type("text/xml").send(vr.toString());
  }
  const heard: string | undefined = req.body.SpeechResult;
  if (heard) {
    call.turns.push({ who: "her", said: heard });
    console.log(`<- (call) ${heard}`);
  } else if (call.turns.length > 0) {
    call.turns.push({ who: "her", said: "(silence)" });
  }
  const herTurns = call.turns.filter((t) => t.who === "her").length;
  const last = herTurns >= MAX_HER_TURNS;
  const step = await onThePhone(last ? `${call.reason} (This is your last turn: say goodbye now.)` : call.reason, call.turns);
  call.turns.push({ who: "kinly", said: step.say });
  console.log(`-> (call) ${step.say}`);

  if (step.end_call || last) {
    vr.say({ voice: VOICE }, step.say);
    vr.hangup();
    const note = step.note ?? "Kinly spoke with her on the phone.";
    addEvent({ kind: "call", level: "yellow", summary: `Kinly called her. ${note}` });
    Promise.all([toFamily(`📞 Kinly → family\nI just called Mom. ${note}`), CARE_WHATSAPP_TO && toCare(`📞 Kinly → care team\nCalled her. ${note}`)]).catch(console.error);
    calls.delete(req.body.CallSid);
  } else {
    const gather = vr.gather({ input: ["speech"], action: `${PUBLIC_URL}/voice`, method: "POST", speechTimeout: "auto", timeout: 6 });
    gather.say({ voice: VOICE }, step.say);
    vr.redirect({ method: "POST" }, `${PUBLIC_URL}/voice`); // silence: ask again
  }
  res.type("text/xml").send(vr.toString());
}

// ---------- Routes ----------

const app = express();
app.use(express.urlencoded({ extended: false }));
app.use(express.json({ limit: "8mb" }));

app.get("/", (_req, res) => res.redirect("/family"));
app.get("/family", (_req, res) => res.type("html").send(FAMILY_PAGE));
app.get("/see", (_req, res) => res.type("html").send(SEE_PAGE));
app.get("/api/events", (_req, res) => res.json(todaysEvents()));
app.get("/api/state", (_req, res) => res.json({ mood }));
app.use("/pet", express.static("pet", { maxAge: "1h" }));

// WhatsApp via Twilio. Twilio waits only ~15 s, so answer at once and reply afterwards.
app.post("/whatsapp", (req, res) => {
  res.type("text/xml").send("<Response></Response>");
  (async () => {
    let image: Incoming["image"];
    const type: string = req.body.MediaContentType0 ?? "";
    if (Number(req.body.NumMedia ?? 0) > 0 && IMAGE_TYPES.includes(type as ImageType)) {
      const auth = Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString("base64");
      const media = await fetch(req.body.MediaUrl0, { headers: { Authorization: `Basic ${auth}` } });
      if (!media.ok) throw new Error(`Media download failed: ${media.status}`);
      image = { data: Buffer.from(await media.arrayBuffer()).toString("base64"), mediaType: type as ImageType };
    }
    await onMessage(req.body.From, req.body.Body ?? "", image);
  })().catch(console.error);
});

// The live camera: a frame plus what she said. Kinly's answer is spoken by the page.
app.post("/api/see", async (req, res) => {
  try {
    const m = /^data:(image\/(?:jpeg|png|webp));base64,(.+)$/.exec(req.body.image ?? "");
    if (!m) return res.status(400).json({ reply: "I couldn't see anything. Try once more?" });
    const v = await herMoment({ text: String(req.body.text ?? ""), image: { mediaType: m[1] as ImageType, data: m[2] }, onCamera: true });
    res.json({ reply: v.reply, level: v.level, mood: v.mood });
  } catch (err) {
    console.error(err);
    res.status(500).json({ reply: "I lost you for a second. Try once more?" });
  }
});

// Kinly reaches out first. Open /nudge/hello, /nudge/pills, /nudge/miss_you or /nudge/goodnight.
const REASONS: Reason[] = ["hello", "pills", "miss_you", "goodnight"];
app.all("/nudge/:reason", async (req, res) => {
  try {
    const reason = req.params.reason as Reason;
    if (!REASONS.includes(reason)) return res.status(404).send(`Try one of: ${REASONS.join(", ")}`);
    if (!elder) return res.status(400).send("I don't know her yet. Have her message Kinly once.");
    res.send(`Sent: ${await reach(reason)}`);
  } catch (err) {
    console.error(err);
    res.status(500).send(String(err));
  }
});

app.post("/voice", (req, res) => {
  callStep(req, res).catch((err) => {
    console.error(err);
    const vr = new twilio.twiml.VoiceResponse();
    vr.say({ voice: VOICE }, "I'm having trouble hearing you. I'm asking your family to call you now. Goodbye.");
    res.type("text/xml").send(vr.toString());
  });
});

// A quiet day: Kinly misses her, once, and says so.
if (QUIET_MINUTES) {
  setInterval(() => {
    if (!elder || missedHer || Date.now() - lastHeard < Number(QUIET_MINUTES) * 60_000) return;
    missedHer = true;
    reach("miss_you").catch(console.error);
  }, 30_000);
}

if (telegramOn) tgListen((m) => onMessage(m.from, m.text, m.image)).catch(console.error);

app.listen(Number(PORT), () => {
  console.log(`Kinly on http://localhost:${PORT}  ·  /family  ·  /see  ·  /nudge/hello`);
  console.log(`Channels: ${[telegramOn && "Telegram", twilioOn && "WhatsApp (Twilio)"].filter(Boolean).join(", ")}`);
});
