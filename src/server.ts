// WhatsApp webhook (Twilio) + the family page.
// Twilio waits only ~15 s for a webhook, so we answer at once and send Kinly's reply afterwards.
import "dotenv/config";
import express from "express";
import twilio from "twilio";
import { think, type Incoming } from "./agent.js";
import { addEvent, todaysEvents } from "./store.js";
import { FAMILY_PAGE } from "./family.js";

const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_FROM, FAMILY_WHATSAPP_TO, PORT = "3000" } =
  process.env;
if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_WHATSAPP_FROM) {
  throw new Error("Fill in TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_FROM in .env");
}
const tw = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
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

    // Yellow or red: bring in a human. Without a second number set, the alert goes to the
    // sender so the demo still shows it.
    if (v.level !== "green" && v.family_alert) {
      const tag = v.level === "red" ? "🔴 Kinly alert" : "🟡 Kinly heads-up";
      await send(FAMILY_WHATSAPP_TO || from, `${tag} about Mom\n${v.family_alert}`);
      console.log(`=> family: ${v.family_alert}`);
    }
  })().catch(async (err) => {
    console.error(err);
    await send(from, "Sorry, something went wrong on my side. Please send it again.").catch(() => {});
  });
});

app.listen(Number(PORT), () => console.log(`Kinly on http://localhost:${PORT}  ·  family page: /family`));
