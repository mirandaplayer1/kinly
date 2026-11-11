// Kinly's switchboard: chat with her and her care circle (Telegram), daily missions on a clock,
// the onboarding page, the live camera page, and the family page.
import "dotenv/config";
import express from "express";
import { withHer, withCircle, reachOut, readMeds, readPills, type Incoming, type Role, type ElderVerdict, type Mood, type Sticker, type Reach } from "./agent.js";
import { brainName } from "./brain.js";
import { addEvent, todaysEvents } from "./store.js";
import { getProfile, saveProfile, onboarded, getState, saveState, today, clock, type Profile } from "./profile.js";
import { missionStatus, completeMission, markAsked } from "./missions.js";
import { findByImprint } from "./pills.js";
import { FAMILY_PAGE } from "./family.js";
import { ONBOARD_PAGE } from "./onboard.js";
import { SEE_PAGE } from "./see.js";
import { DEMO_PAGE } from "./demo.js";
import { telegramOn, botUsername, hasBot, tgText, tgSticker, tgListen, type TgIncoming } from "./telegram.js";

const { PUBLIC_URL, QUIET_MINUTES, PORT = "3000" } = process.env;
// DEMO_ONLY=1: no Telegram at all. Three chats live in memory and are shown side by side at /demo.
const DEMO = process.env.DEMO_ONLY === "1";
if (!DEMO && !telegramOn) throw new Error("Set TELEGRAM_BOT_TOKEN in .env");
const base = PUBLIC_URL || `http://localhost:${PORT}`;

let mood: Mood = "cozy"; // how Kinly feels right now
let lastHeard = Date.now(); // when she last wrote or showed something
let missedHer = false; // one "I miss you" per quiet stretch
const changes: { time: string; text: string }[] = []; // changes Kinly noticed today, for the family page

// The demo channel: addresses "demo:elder", "demo:family" and "demo:care", each a transcript in memory.
type DemoWho = "elder" | "family" | "care";
type DemoLine = { from: "kinly" | "me"; text?: string; sticker?: string; image?: string; time: string };
const DEMO_WHO: DemoWho[] = ["elder", "family", "care"];
const demoChats: Record<string, DemoLine[]> = { "demo:elder": [], "demo:family": [], "demo:care": [] };
const demoPending: Record<string, number> = { "demo:elder": 0, "demo:family": 0, "demo:care": 0 }; // Kinly is working on an answer for this chat
const demoLine = (to: string, line: Omit<DemoLine, "time">) => void (demoChats[to] ??= []).push({ ...line, time: new Date().toISOString() });

// Everything Kinly sends goes through here; the address says which channel it travels on.
async function deliver(to: string, m: { text?: string; sticker?: Sticker }) {
  if (to.startsWith("demo:")) {
    if (m.sticker && m.sticker !== "none") demoLine(to, { from: "kinly", sticker: m.sticker });
    if (m.text) demoLine(to, { from: "kinly", text: m.text });
    return;
  }
  if (m.sticker && m.sticker !== "none") await tgSticker(to, `pet/sticker_${m.sticker}.webp`);
  if (m.text) await tgText(to, m.text);
}
const send = (to: string, body: string) => deliver(to, { text: body });

// Family and care team each hear only what is theirs. With nobody joined yet, the note lands in
// her own chat, labelled, so a one-phone demo still shows every route.
async function toCircle(who: "family" | "care", body: string) {
  const s = getState();
  const list = who === "family" ? s.family : s.care.length ? s.care : s.family;
  const targets = list.length ? list : s.elder ? [s.elder] : [];
  await Promise.all(targets.map((to) => send(to, body)));
}

// To her, Kinly has a face: a sticker dropped before the words.
async function sayToHer(body: string, feeling: Mood, sticker: Sticker = "none") {
  const { elder } = getState();
  if (!elder) return;
  mood = feeling;
  if (sticker !== "none") await deliver(elder, { sticker }).catch(console.error);
  await send(elder, body);
}

async function reach(r: Reach) {
  const { elder } = getState();
  const shown = elder?.startsWith("demo:") ? elder : null; // the demo page shows Kinly typing meanwhile
  if (shown) demoPending[shown]++;
  try {
    const out = await reachOut(r, PUBLIC_URL ? `${PUBLIC_URL}/see` : null);
    await sayToHer(out.message, out.mood, out.sticker);
    console.log(`-> her (${r.why}${r.why === "mission" ? ` ${r.mission.id}` : ""}): ${out.message}`);
    return out.message;
  } finally {
    if (shown) demoPending[shown]--;
  }
}

// ---------- Her side: one path for chat and the camera ----------

async function herMoment(msg: Incoming): Promise<ElderVerdict> {
  lastHeard = Date.now();
  missedHer = false;
  const v = await withHer(msg);
  if (msg.onCamera) mood = v.mood;
  console.log(`-> her [${v.level}/${v.mood}${v.mission_done !== "none" ? `/${v.mission_done}` : ""}] ${v.reply}`);

  const s = getState();
  if (v.mission_done !== "none") completeMission(v.mission_done);
  if (v.observation) s.observations.push({ day: today(), kind: v.kind, note: v.observation });
  if (v.remember_note) s.memories.push({ note: v.remember_note, remindAt: v.remember_at, told: false, day: today() });
  if (v.change) changes.push({ time: new Date().toISOString(), text: v.change });
  saveState();

  // She rearranges her own day by telling Kinly.
  if (v.set_task !== "none" || v.set_activity) {
    const p: Profile = structuredClone(getProfile());
    const time = v.set_time && /^\d{2}:\d{2}$/.test(v.set_time) ? v.set_time : null;
    if (v.set_activity) p.tasks.activity.what = v.set_activity;
    if (time && v.set_task === "activity") p.tasks.activity.time = time;
    if (time && v.set_task === "journal") p.tasks.journal.time = time;
    if (time && (v.set_task === "breakfast" || v.set_task === "lunch" || v.set_task === "dinner")) p.tasks.meals[v.set_task] = time;
    saveProfile(p);
  }

  addEvent({
    kind: v.kind,
    level: v.level,
    summary: v.log,
    photo: msg.media?.kind === "image" ? `data:${msg.media.mediaType};base64,${msg.media.data}` : undefined,
  });
  if (v.to_family) {
    const tag = v.level === "red" ? "🔴 " : v.level === "yellow" ? "🟡 " : "";
    await toCircle("family", `${tag}Kinly → family\n${v.to_family}`);
  }
  if (v.to_care_team) await toCircle("care", `${v.level === "red" ? "🔴 " : ""}Kinly → care team\n${v.to_care_team}`);
  return v;
}

// Who is writing? People who joined by invite link are known; a "family:" or "care:" prefix lets
// one phone play every part.
function roleOf(from: string, text: string, via: TgIncoming["via"] = "main"): { role: "elder" | Role; text: string } {
  if (via !== "main") return { role: via, text };
  const m = text.match(/^\s*(family|care)\s*:\s*/i);
  if (m) return { role: m[1].toLowerCase() as Role, text: text.slice(m[0].length) };
  const s = getState();
  if (from === s.elder) return { role: "elder", text };
  if (s.family.includes(from)) return { role: "family", text };
  if (s.care.includes(from)) return { role: "care", text };
  return { role: s.elder ? "family" : "elder", text };
}

// Someone opened an invite link: /start elder, /start family or /start care.
async function join(from: string, as: string) {
  const s = getState();
  const p = getProfile();
  s.family = s.family.filter((x) => x !== from);
  s.care = s.care.filter((x) => x !== from);
  if (as === "family") {
    if (s.elder === from) s.elder = undefined;
    s.family.push(from);
    saveState();
    return send(from, `Hi! I'm Kinly, ${p.elderName}'s companion. You're in her circle now. Ask me how she's doing any time, or tell me something to pass on to her.`);
  }
  if (as === "care") {
    if (s.elder === from) s.elder = undefined;
    s.care.push(from);
    saveState();
    return send(from, `Hello, I'm Kinly, ${p.elderName}'s companion. I'll message you only when something needs a professional, and you can send me changes to pass on to her.`);
  }
  s.elder = from;
  saveState();
  if (!onboarded()) await send(from, `Kinly isn't set up yet. Set it up here: ${base}/start`);
  return reach({ why: "hello" });
}

async function onMessage(m: TgIncoming): Promise<void> {
  // A stand-in bot is always its role: opening it, or writing in it, joins that chat to the circle.
  if (m.via !== "main") {
    const s = getState();
    const list = m.via === "family" ? s.family : s.care;
    if (m.start !== undefined || !list.includes(m.from)) {
      await join(m.from, m.via);
      if (m.start !== undefined) return;
    }
  } else if (m.start !== undefined) {
    return void (await join(m.from, m.start));
  }
  const { role, text } = roleOf(m.from, m.text, m.via);
  console.log(`<- ${role} ${m.from}: ${text || `(${m.media?.kind ?? "nothing"})`}`);
  try {
    if (m.tooBig) return void (await send(m.from, "That video is a bit too big for me to open. Could you send a shorter one, under a minute?"));
    if (role === "elder") {
      const s = getState();
      if (!s.elder) { s.elder = m.from; saveState(); }
      const v = await herMoment({ text, media: m.media });
      return void (await sayToHer(v.reply, v.mood, v.sticker));
    }
    const c = await withCircle(role, text);
    addEvent({ kind: role, level: "green", summary: c.log });
    await send(m.from, `Kinly → ${role === "family" ? "family" : "care team"}\n${c.reply}`);
    console.log(`-> ${role}: ${c.reply}`);
    if (c.to_her) {
      await sayToHer(c.to_her, role === "family" ? "happy" : "cozy", role === "family" ? "love" : "cozy");
      console.log(`-> her (passed on): ${c.to_her}`);
    }
  } catch (err) {
    console.error(err);
    await send(m.from, "Sorry, something went wrong on my side. Please send it again.").catch(() => {});
  }
}

// ---------- The clock: missions at their time, reminders, a quiet day ----------

const minutes = (hhmm: string) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5));
let busy = false;

async function tick() {
  const s = getState();
  if (busy || !s.elder) return;
  busy = true;
  try {
    const now = minutes(clock());
    // A mission is brought up at its time. One that came due more than an hour ago (say, before
    // Kinly was switched on) is left alone rather than sent late in a burst.
    const due = missionStatus().find((m) => !m.done && !m.asked && minutes(m.time) <= now && now - minutes(m.time) <= 60);
    if (due) {
      markAsked(due.id);
      await reach({ why: "mission", mission: due });
      return;
    }
    const stamp = `${today()}T${clock()}`;
    const memory = s.memories.find((x) => !x.told && x.remindAt && x.remindAt <= stamp);
    if (memory) {
      memory.told = true;
      saveState();
      await reach({ why: "reminder", note: memory.note });
      return;
    }
    if (QUIET_MINUTES && !missedHer && Date.now() - lastHeard >= Number(QUIET_MINUTES) * 60_000) {
      missedHer = true;
      await reach({ why: "miss_you" });
    }
  } catch (err) {
    console.error(err);
  } finally {
    busy = false;
  }
}
setInterval(tick, 20_000);

// ---------- Routes ----------

const app = express();
app.use(express.json({ limit: "8mb" }));

app.get("/", (_req, res) => res.redirect(onboarded() ? "/family" : "/start"));
app.get("/start", (_req, res) => res.type("html").send(ONBOARD_PAGE));
app.get("/family", (_req, res) => res.type("html").send(FAMILY_PAGE));
app.get("/see", (_req, res) => res.type("html").send(SEE_PAGE));
app.use("/pet", express.static("pet", { maxAge: "1h" }));

const profileView = () => ({
  onboarded: onboarded(),
  profile: getProfile(),
  reminders: getState().memories.filter((m) => !m.told && m.remindAt && m.note.startsWith("[from family] ")).map((m) => ({ note: m.note.replace("[from family] ", ""), at: m.remindAt })),
  links: DEMO
    ? { elder: `${base}/demo#elder`, family: `${base}/demo#family`, care: `${base}/demo#care`, page: `${base}/family` }
    : {
        elder: `https://t.me/${botUsername()}?start=elder`,
        family: hasBot("family") ? `https://t.me/${botUsername("family")}` : `https://t.me/${botUsername()}?start=family`,
        care: hasBot("care") ? `https://t.me/${botUsername("care")}` : `https://t.me/${botUsername()}?start=care`,
        page: `${base}/family`,
      },
});
app.get("/api/profile", (_req, res) => res.json(profileView()));

// Onboarding sends who she is, her medicines, and any reminders the family set for her.
// Activity, meals and the daily record keep their times; she changes those by telling Kinly.
type Setup = {
  self?: boolean;
  elderName: string;
  familyName: string;
  relation?: string;
  about?: string;
  meds?: { list: Profile["tasks"]["meds"]["list"]; times: Profile["tasks"]["meds"]["times"] };
  measure?: Profile["tasks"]["measure"];
  reminders?: { note: string; at: string }[];
};
app.post("/api/profile", (req, res) => {
  const b = req.body as Setup;
  if (!b?.elderName?.trim() || (!b.self && !b?.familyName?.trim())) return res.status(400).json({ error: b?.self ? "Tell Kinly your name first" : "Tell Kinly both names first" });
  const p: Profile = structuredClone(getProfile());
  p.elderName = b.elderName.trim();
  p.self = Boolean(b.self);
  p.familyName = p.self ? "" : b.familyName.trim();
  p.relation = (b.relation ?? p.relation ?? "Mom").trim().slice(0, 40);
  p.about = (b.about ?? "").trim();
  if (b.meds) p.tasks.meds = { on: true, list: b.meds.list.filter((m) => m.name.trim() && m.slots.length), times: b.meds.times };
  if (b.measure) p.tasks.measure = { glucose: b.measure.glucose ?? [], pressure: b.measure.pressure ?? [] };
  saveProfile(p);
  const s = getState();
  s.memories = s.memories.filter((m) => m.told || !m.remindAt || !m.note.startsWith("[from family] "));
  for (const r of b.reminders ?? []) {
    if (r.note.trim() && r.at) s.memories.push({ note: `[from family] ${r.note.trim()}`, remindAt: r.at, told: false, day: today() });
  }
  saveState();
  console.log(`Profile saved for ${p.elderName}`);
  res.json(profileView());
});

// Onboarding: a photo of the pharmacy bag or prescription, read into a list the family can fix.
app.post("/api/read-meds", async (req, res) => {
  try {
    const m = /^data:(image\/(?:jpeg|png|webp));base64,(.+)$/.exec(req.body.image ?? "");
    if (!m) return res.status(400).json({ meds: [], note: "That file isn't a photo I can open. Try a JPG or PNG." });
    res.json(await readMeds({ mediaType: m[1], data: m[2] }));
  } catch (err) {
    console.error(err);
    res.status(500).json({ meds: [], note: "I couldn't read that just now. Try once more, or type them in." });
  }
});

app.get("/api/today", (_req, res) =>
  res.json({ elderName: getProfile().elderName, mood, missions: missionStatus(), changes, events: todaysEvents() }),
);

// The live camera: a frame plus what she said. Kinly's answer is spoken by the page.
app.post("/api/see", async (req, res) => {
  try {
    const m = /^data:(image\/(?:jpeg|png|webp));base64,(.+)$/.exec(req.body.image ?? "");
    if (!m) return res.status(400).json({ reply: "I couldn't see anything. Try once more?" });
    const v = await herMoment({ text: String(req.body.text ?? ""), media: { kind: "image", mediaType: m[1], data: m[2] }, onCamera: true });
    res.json({ reply: v.reply, level: v.level, mood: v.mood });
  } catch (err) {
    console.error(err);
    res.status(500).json({ reply: "I lost you for a second. Try once more?" });
  }
});

// Onboarding: a photo of the pills themselves. Kinly reads what is stamped on each and looks it up.
// A pill it cannot place stays in the list by its looks, for the family to name.
app.post("/api/read-pills", async (req, res) => {
  try {
    const m = /^data:(image\/(?:jpeg|png|webp));base64,(.+)$/.exec(req.body.image ?? "");
    if (!m) return res.status(400).json({ meds: [], note: "That file isn't a photo I can open. Try a JPG or PNG." });
    const seen = await readPills({ mediaType: m[1], data: m[2] });
    let named = 0;
    const meds = seen.pills.map((p) => {
      const pill = p.imprint ? findByImprint(p.imprint) : null;
      if (pill) named++;
      return { name: pill ? pill.name : `${p.look}${p.imprint ? ` marked ${p.imprint}` : ""} (name?)`, slots: ["morning"] };
    });
    const unnamed = meds.length - named;
    const note = meds.length === 0 ? seen.note
      : unnamed === 0 ? "I know these by their markings. Tell me when she takes each one."
      : named === 0 ? "I can see them, but I can't name a pill from its looks alone. Type the names in, or show me the label."
      : `I know ${named} by the markings. Type in the name for the other${unnamed > 1 ? "s" : ""}, or show me the label.`;
    res.json({ meds, note });
  } catch (err) {
    console.error(err);
    res.status(500).json({ meds: [], note: "I couldn't look at that just now. Try once more, or type them in." });
  }
});

// Kinly reaches out now, without waiting for the clock:
// /nudge/hello, /nudge/miss_you, /nudge/goodnight, /nudge/next (the next open mission), or /nudge/<mission id>.
app.all("/nudge/:what", async (req, res) => {
  try {
    if (!getState().elder) return res.status(400).send("I don't know her yet. Open her invite link first.");
    const what = req.params.what;
    if (what === "hello" || what === "miss_you" || what === "goodnight") return res.send(`Sent: ${await reach({ why: what })}`);
    const open = missionStatus().filter((m) => !m.done);
    const mission = what === "next" ? (open.find((m) => !m.asked) ?? open[0]) : open.find((m) => m.id === what);
    if (!mission) return res.status(404).send(`No open mission "${what}". Open ones: ${open.map((m) => m.id).join(", ") || "none"}`);
    markAsked(mission.id);
    res.send(`Sent: ${await reach({ why: "mission", mission })}`);
  } catch (err) {
    console.error(err);
    res.status(500).send(String(err));
  }
});

// ---------- The demo channel: three chats on one page, no Telegram ----------

if (DEMO) {
  app.get("/demo", (_req, res) => res.type("html").send(DEMO_PAGE));

  app.get("/api/demo", (_req, res) => {
    const s = getState();
    const joined = { elder: s.elder === "demo:elder", family: s.family.includes("demo:family"), care: s.care.includes("demo:care") };
    res.json({
      chats: Object.fromEntries(DEMO_WHO.map((w) => [w, demoChats[`demo:${w}`]])),
      pending: Object.fromEntries(DEMO_WHO.map((w) => [w, demoPending[`demo:${w}`] > 0])),
      joined,
    });
  });

  // One person says something (or opens their chat for the first time, with `start`). It takes the
  // same road as a Telegram message: onMessage, with the demo address as the sender.
  app.post("/api/demo/say", async (req, res) => {
    const who = req.body?.who as DemoWho;
    if (!DEMO_WHO.includes(who)) return res.status(400).json({ error: "who must be elder, family or care" });
    const text = String(req.body?.text ?? "").trim();
    const image = typeof req.body?.image === "string" ? req.body.image : undefined;
    const m = image ? /^data:(image\/(?:jpeg|png|webp));base64,(.+)$/.exec(image) : null;
    if (image && !m) return res.status(400).json({ error: "image must be a JPEG, PNG or WebP data URL" });
    const from = `demo:${who}`;
    const via = who === "elder" ? "main" : who;
    const said = Boolean(text || m);
    if (!said && !req.body?.start) return res.status(400).json({ error: "Nothing to say" });
    if (said) demoLine(from, { from: "me", ...(text ? { text } : {}), ...(image ? { image } : {}) });
    demoPending[from]++;
    try {
      // First contact for her is the invite link: join as elder, and Kinly says hello.
      const firstTime = who === "elder" && getState().elder !== from;
      if (firstTime || (!said && who !== "elder")) await onMessage({ from, via, text: "", start: who });
      if (said) await onMessage({ from, via, text, media: m ? { kind: "image", mediaType: m[1], data: m[2] } : undefined });
      res.json({ ok: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: String(err) });
    } finally {
      demoPending[from]--;
    }
  });
} else {
  tgListen(onMessage);
}

app.listen(Number(PORT), () => {
  console.log(`Kinly on ${base}  ·  /start  ·  /family  ·  /see  ·  /nudge/next${DEMO ? "  ·  /demo (demo only, no Telegram)" : ""}`);
  console.log(`Brain: ${brainName}`);
});
