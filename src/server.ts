// WhatsApp webhook (Twilio), the phone call Kinly makes on a red alert, and the family page.
// Twilio waits only ~15 s for a webhook, so WhatsApp is answered at once and Kinly's reply follows.
import "dotenv/config";
import express from "express";
import twilio from "twilio";
import { think, talk, type Incoming, type CallTurn } from "./agent.js";
import { addEvent, todaysEvents } from "./store.js";
import { FAMILY_PAGE } from "./family.js";

const {
  TWILIO_ACCOUNT_SID,
  TWILIO_AUTH_TOKEN,
  TWILIO_WHATSAPP_FROM,
  TWILIO_VOICE_FROM, // a Twilio phone number, e.g. +15551234567. Without it Kinly does not call.
  PUBLIC_URL, // the ngrok https URL, needed for calls
  FAMILY_WHATSAPP_TO,
  PORT = "3000",
} = process.env;
if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_WHATSAPP_FROM) {
  throw new Error("Fill in TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_FROM in .env");
}
const tw = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
const VOICE = "Polly.Joanna-Neural";
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"] as const;
type ImageType = (typeof IMAGE_TYPES)[number];

async function downloadImage(url: string, type: string): Promise<Incoming["image"]> {
  if (!IMAGE_TYPES.includes(type as ImageType)) return undefined;
  const auth = Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString("base64");
  const res = await fetch(url, { headers: { Authorization: `Basic ${auth}` } });
  if (!res.ok) throw new Error(`Media download failed: ${res.status}`);
  return { data: Buffer.from(await res.arrayBuffer()).toString("base64"), mediaType: type as ImageType };
}

const send = (to: string, body: string) => tw.messages.create({ from: TWILIO_WHATSAPP_FROM, to, body });
const tellFamily = (elder: string, body: string) => send(FAMILY_WHATSAPP_TO || elder, body);

// Calls in progress, keyed by Twilio CallSid.
type Call = { elder: string; reason: string; turns: CallTurn[] };
const calls = new Map<string, Call>();
const MAX_HER_TURNS = 3;

async function ringHer(elderWhatsApp: string, reason: string) {
  if (!TWILIO_VOICE_FROM || !PUBLIC_URL) return;
  const call = await tw.calls.create({
    to: elderWhatsApp.replace("whatsapp:", ""),
    from: TWILIO_VOICE_FROM,
    url: `${PUBLIC_URL}/voice`,
  });
  calls.set(call.sid, { elder: elderWhatsApp, reason, turns: [] });
  console.log(`=> calling her (${call.sid})`);
}

const app = express();
app.use(express.urlencoded({ extended: false }));

app.get("/", (_req, res) => res.redirect("/family"));
app.get("/family", (_req, res) => res.type("html").send(FAMILY_PAGE));
app.get("/api/events", (_req, res) => res.json(todaysEvents()));

app.post("/whatsapp", (req, res) => {
  res.type("text/xml").send("<Response></Response>");

  const from: string = req.body.From;
  const text: string = req.body.Body ?? "";
  const numMedia = Number(req.body.NumMedia ?? 0);
  console.log(`<- ${from}: ${text || "(photo)"}`);

  (async () => {
    const image =
      numMedia > 0 ? await downloadImage(req.body.MediaUrl0, req.body.MediaContentType0) : undefined;
    const v = await think({ text, image });

    await send(from, v.reply);
    console.log(`-> [${v.level}] ${v.reply}`);

    addEvent({
      kind: v.kind,
      level: v.level,
      summary: v.family_log,
      photo: image ? `data:${image.mediaType};base64,${image.data}` : undefined,
    });

    // Yellow or red: bring in a human. Red: Kinly also rings her.
    // Without a second number set, the alert goes to the sender so the demo still shows it.
    if (v.level !== "green" && v.family_alert) {
      const tag = v.level === "red" ? "🔴 Kinly alert" : "🟡 Kinly heads-up";
      await tellFamily(from, `${tag} about Mom\n${v.family_alert}`);
      console.log(`=> family: ${v.family_alert}`);
    }
    if (v.level === "red") await ringHer(from, v.family_log);
  })().catch(async (err) => {
    console.error(err);
    await send(from, "Sorry, something went wrong on my side. Please send it again.").catch(() => {});
  });
});

// One step of the phone call: Twilio posts what she said, Kinly answers and listens again.
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
    call.turns.push({ who: "her", said: "(silence, no answer)" });
  }

  const herTurns = call.turns.filter((t) => t.who === "her").length;
  const step = await talk(
    herTurns >= MAX_HER_TURNS ? `${call.reason} (This is your last turn: say goodbye now.)` : call.reason,
    call.turns,
  );
  call.turns.push({ who: "kinly", said: step.say });
  console.log(`-> (call) ${step.say}`);

  if (step.end_call || herTurns >= MAX_HER_TURNS) {
    vr.say({ voice: VOICE }, step.say);
    vr.hangup();
    const note = step.family_note ?? "Kinly spoke with Mom on the phone.";
    addEvent({ kind: "call", level: "yellow", summary: `Kinly called her. ${note}` });
    tellFamily(call.elder, `📞 Kinly just called Mom\n${note}`).catch(console.error);
    calls.delete(req.body.CallSid);
  } else {
    const gather = vr.gather({ input: ["speech"], action: `${PUBLIC_URL}/voice`, method: "POST", speechTimeout: "auto", timeout: 6 });
    gather.say({ voice: VOICE }, step.say);
    vr.redirect({ method: "POST" }, `${PUBLIC_URL}/voice`); // she said nothing: ask again
  }
  res.type("text/xml").send(vr.toString());
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
  console.log(`Kinly on http://localhost:${PORT}  ·  family page: /family`);
  console.log(TWILIO_VOICE_FROM && PUBLIC_URL ? "Phone calls: on" : "Phone calls: off (set TWILIO_VOICE_FROM and PUBLIC_URL)");
});
