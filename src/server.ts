// Kinly's switchboard: WhatsApp with her and her care circle, the live camera page,
// the phone call on a red moment, and the family page.
// Twilio waits only ~15 s for a webhook, so WhatsApp is answered at once and Kinly's reply follows.
import "dotenv/config";
import express from "express";
import twilio from "twilio";
import { withHer, withCircle, reachOut, onThePhone, type Incoming, type CallTurn, type Role, type ElderVerdict, type Mood, type Reason } from "./agent.js";
import { addEvent, todaysEvents } from "./store.js";
import { FAMILY_PAGE } from "./family.js";
import { SEE_PAGE } from "./see.js";

const {
  TWILIO_ACCOUNT_SID,
  TWILIO_AUTH_TOKEN,
  TWILIO_WHATSAPP_FROM,
  TWILIO_VOICE_FROM, // a Twilio phone number, e.g. +15551234567. Without it Kinly does not call.
  PUBLIC_URL, // the ngrok https URL: needed for calls and for the camera link
  ELDER_WHATSAPP, // her number, e.g. whatsapp:+886912345678. If unset, the first person to write is her.
  FAMILY_WHATSAPP_TO,
  CARE_WHATSAPP_TO,
  QUIET_MINUTES, // if set, Kinly says "I miss you" after this many quiet minutes
  PORT = "3000",
} = process.env;
if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_WHATSAPP_FROM) {
  throw new Error("Fill in TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_FROM in .env");
}
const tw = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
const VOICE = "Polly.Joanna-Neural";
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"] as const;
type ImageType = (typeof IMAGE_TYPES)[number];

let elder: string | undefined = ELDER_WHATSAPP;
let mood: Mood = "cozy"; // how Kinly feels right now
let shownMood: Mood | undefined; // the last picture of Kinly she was sent
let lastHeard = Date.now(); // when she last wrote or showed something
let missedHer = false; // one "I miss you" per quiet stretch

const send = (to: string, body: string) => tw.messages.create({ from: TWILIO_WHATSAPP_FROM, to, body });

// To her, Kinly has a face. A picture goes along when Kinly's mood changes, or always when asked.
async function sayToHer(body: string, feeling: Mood, withPicture = false) {
  if (!elder) return;
  mood = feeling;
  const picture = PUBLIC_URL && (withPicture || feeling !== shownMood) ? [`${PUBLIC_URL}/pet/${feeling}.png`] : undefined;
  if (picture) shownMood = feeling;
  await tw.messages.create({ from: TWILIO_WHATSAPP_FROM, to: elder, body, mediaUrl: picture });
}

async function reach(reason: Reason) {
  const out = await reachOut(reason, PUBLIC_URL ? `${PUBLIC_URL}/see` : null);
  await sayToHer(out.message, out.mood, true);
  console.log(`-> her (${reason}): ${out.message}`);
  return out.message;
}
// With one phone, family and care-team messages land in the same chat, labelled, so every route is visible.
const toFamily = (body: string) => (FAMILY_WHATSAPP_TO || elder) && send((FAMILY_WHATSAPP_TO || elder)!, body);
const toCare = (body: string) => (CARE_WHATSAPP_TO || FAMILY_WHATSAPP_TO || elder) && send((CARE_WHATSAPP_TO || FAMILY_WHATSAPP_TO || elder)!, body);

async function downloadImage(url: string, type: string): Promise<Incoming["image"]> {
  if (!IMAGE_TYPES.includes(type as ImageType)) return undefined;
  const auth = Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString("base64");
  const res = await fetch(url, { headers: { Authorization: `Basic ${auth}` } });
  if (!res.ok) throw new Error(`Media download failed: ${res.status}`);
  return { data: Buffer.from(await res.arrayBuffer()).toString("base64"), mediaType: type as ImageType };
}

// Who is writing? Known numbers first; a "family:" or "care:" prefix lets one phone play every part.
function roleOf(from: string, text: string): { role: "elder" | Role; text: string } {
  const m = text.match(/^\s*(family|care)\s*:\s*/i);
  if (m) return { role: m[1].toLowerCase() as Role, text: text.slice(m[0].length) };
  if (from === FAMILY_WHATSAPP_TO) return { role: "family", text };
  if (from === CARE_WHATSAPP_TO) return { role: "care", text };
  return { role: "elder", text };
}

// ---------- Her side: one path for WhatsApp and the camera ----------

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

// ---------- Phone call ----------

type Call = { reason: string; turns: CallTurn[] };
const calls = new Map<string, Call>();
const MAX_HER_TURNS = 3;

async function ringHer(reason: string) {
  if (!TWILIO_VOICE_FROM || !PUBLIC_URL || !elder) return;
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

app.post("/whatsapp", (req, res) => {
  res.type("text/xml").send("<Response></Response>");
  const from: string = req.body.From;
  const numMedia = Number(req.body.NumMedia ?? 0);
  const { role, text } = roleOf(from, req.body.Body ?? "");
  console.log(`<- ${role} ${from}: ${text || "(photo)"}`);

  (async () => {
    if (role === "elder") {
      elder ??= from;
      const image = numMedia > 0 ? await downloadImage(req.body.MediaUrl0, req.body.MediaContentType0) : undefined;
      const v = await herMoment({ text, image });
      await sayToHer(v.reply, v.mood);
      return;
    }
    // Family or care team writing to Kinly.
    const c = await withCircle(role, text);
    addEvent({ kind: role, level: "green", summary: c.log });
    await send(from, c.reply);
    console.log(`-> ${role}: ${c.reply}`);
    if (c.to_her && elder) {
      await sayToHer(c.to_her, role === "family" ? "happy" : "cozy");
      console.log(`-> her (passed on): ${c.to_her}`);
    }
  })().catch(async (err) => {
    console.error(err);
    await send(from, "Sorry, something went wrong on my side. Please send it again.").catch(() => {});
  });
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
    if (!elder) return res.status(400).send("I don't know her number yet. Set ELDER_WHATSAPP, or have her message Kinly once.");
    res.send(`Sent: ${await reach(reason)}`);
  } catch (err) {
    console.error(err);
    res.status(500).send(String(err));
  }
});

// A quiet day: Kinly misses her, once, and says so.
if (QUIET_MINUTES) {
  setInterval(() => {
    if (!elder || missedHer || Date.now() - lastHeard < Number(QUIET_MINUTES) * 60_000) return;
    missedHer = true;
    reach("miss_you").catch(console.error);
  }, 30_000);
}

app.post("/voice", (req, res) => {
  callStep(req, res).catch((err) => {
    console.error(err);
    const vr = new twilio.twiml.VoiceResponse();
    vr.say({ voice: VOICE }, "I'm having trouble hearing you. I'm asking your family to call you now. Goodbye.");
    res.type("text/xml").send(vr.toString());
  });
});

app.listen(Number(PORT), () => {
  console.log(`Kinly on http://localhost:${PORT}  ·  /family  ·  /see  ·  /nudge/hello`);
  console.log(TWILIO_VOICE_FROM && PUBLIC_URL ? "Phone calls: on" : "Phone calls: off (set TWILIO_VOICE_FROM and PUBLIC_URL)");
});
