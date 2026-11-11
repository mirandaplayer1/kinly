// Records a walkthrough of Kinly, unattended: onboarding, then a day across three phones.
//
//   node scripts/walkthrough.mjs
//
// It starts its own demo instance (DEMO_ONLY=1, state in .kinly-demo/, port 3100), drives the
// installed Google Chrome headless, and records only that browser page. Nothing Kinly says is
// scripted: every reply comes from the model, about 9 model calls per run.
// Out: demo/walkthrough.mp4, demo/walkthrough-2x.mp4, demo/walkthrough-transcript.json
//
// DRY=1 runs the same clicks with the model keys blanked and the label reading faked, to check
// the page and the script without spending anything. Its output goes to a temp folder.
import { spawn, execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const PORT = process.env.DEMO_PORT || "3100";
const BASE = `http://localhost:${PORT}`;
const DRY = process.env.DRY === "1";
const SERVER = process.env.KINLY_SERVER || "src/server.ts";
const STATE = path.join(ROOT, ".kinly-demo");
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), "kinly-walkthrough-"));
const OUT = DRY ? TMP : path.join(ROOT, "demo");
const REPLY_TIMEOUT = DRY ? 8_000 : 60_000;

if (PORT === "3000") throw new Error("Port 3000 is the live Kinly. Pick another DEMO_PORT.");

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const notes = []; // timeouts and anything else that did not go as planned
const beats = []; // what each beat added to the three chats
let beat = "0";
const note = (text) => { notes.push({ beat, note: text }); console.log(`   ! ${text}`); };

// ---------- The demo instance ----------

async function up() {
  try { return (await fetch(`${BASE}/api/demo`, { signal: AbortSignal.timeout(1500) })).ok; } catch { return false; }
}
if (await up()) throw new Error(`Something already answers on ${BASE}. Stop it first.`);
fs.rmSync(STATE, { recursive: true, force: true });
fs.mkdirSync(STATE, { recursive: true });
const log = fs.openSync(path.join(STATE, "server.log"), "w");
const server = spawn(path.join(ROOT, "node_modules/.bin/tsx"), [SERVER], {
  cwd: ROOT,
  stdio: ["ignore", log, log],
  env: {
    ...process.env,
    KINLY_DIR: ".kinly-demo",
    DEMO_ONLY: "1",
    PORT,
    PUBLIC_URL: "",
    QUIET_MINUTES: "",
    DEMO_CLOCK: process.env.DEMO_CLOCK ?? "08:05", // a morning scene, whenever it is recorded
    ...(DRY ? { GEMINI_API_KEY: "", ANTHROPIC_API_KEY: "" } : {}),
  },
});
const stop = () => { try { server.kill("SIGTERM"); } catch {} };
process.on("exit", stop);
process.on("SIGINT", () => process.exit(130));
for (let i = 0; !(await up()); i++) {
  if (i > 40 || server.exitCode !== null) throw new Error(`The demo instance did not start. See ${path.join(STATE, "server.log")}`);
  await sleep(500);
}
console.log(`Demo instance on ${BASE}${DRY ? " (dry run, no model)" : ""}`);

// ---------- Photos Margaret sends ----------

const onePill = path.join(TMP, "one-pill.jpg");
const bothPills = path.join(TMP, "both-pills.jpg");
const props = ["demo/props/pills-one.jpg", "demo/props/pills-both.jpg"].map((f) => path.join(ROOT, f));
if (props.every((f) => fs.existsSync(f))) { fs.copyFileSync(props[0], onePill); fs.copyFileSync(props[1], bothPills); }
else { fs.copyFileSync(path.join(ROOT, "med/ref/NORVASC_TABLETS_5MG"), onePill);
execFileSync("ffmpeg", ["-loglevel", "error", "-y",
  "-i", path.join(ROOT, "med/ref/NORVASC_TABLETS_5MG"), "-i", path.join(ROOT, "med/ref/GLUCOPHAGE_TABLETS"),
  "-filter_complex", "[0]scale=-2:640[a];[1]scale=-2:640[b];[a][b]hstack=inputs=2", "-q:v", "3", bothPills]); }

// ---------- The browser ----------

// Playwright encodes its recording with ffmpeg and normally wants its own copy downloaded. The
// ffmpeg already on this machine does the same job, so it is linked where Playwright looks.
const ffmpegRevision = JSON.parse(fs.readFileSync(path.join(ROOT, "node_modules/playwright-core/browsers.json"), "utf8")).browsers.find((b) => b.name === "ffmpeg").revision;
const ffmpegHome = path.join(TMP, "playwright", `ffmpeg-${ffmpegRevision}`);
fs.mkdirSync(ffmpegHome, { recursive: true });
fs.symlinkSync(execFileSync("which", ["ffmpeg"], { encoding: "utf8" }).trim(), path.join(ffmpegHome, process.platform === "darwin" ? "ffmpeg-mac" : process.platform === "win32" ? "ffmpeg-win64.exe" : "ffmpeg-linux"));
process.env.PLAYWRIGHT_BROWSERS_PATH = path.join(TMP, "playwright");
const { chromium } = await import("playwright-core");

const browser = await chromium.launch({ channel: "chrome", headless: true });
const context = await browser.newContext({
  viewport: { width: 1600, height: 900 },
  locale: "en-US",
  recordVideo: { dir: TMP, size: { width: 1600, height: 900 } },
});
const page = await context.newPage();

async function caption(text, bottom = 20) {
  console.log(`\n${text}`);
  await page.evaluate(({ text, bottom }) => {
    let c = document.getElementById("walk-caption");
    if (!c) {
      c = document.createElement("div");
      c.id = "walk-caption";
      c.style.cssText = "position:fixed;left:24px;z-index:99999;max-width:62vw;background:#fbf3e4;color:#3b2f2a;border:1.5px solid #3b2f2a;border-radius:12px;padding:11px 16px;font:600 17px/1.25 Geist,'Helvetica Neue',Arial,sans-serif;box-shadow:0 10px 20px -12px rgb(59 47 42 / .7)";
      document.body.appendChild(c);
    }
    c.style.bottom = bottom + "px";
    c.textContent = text;
  }, { text, bottom });
}
const hold = (ms = 1200) => page.waitForTimeout(ms);
const type = (selector, text, delay = 28) => page.locator(selector).pressSequentially(text, { delay });

const chats = async () => (await fetch(`${BASE}/api/demo`)).json();
const fromKinly = (d) => Object.values(d.chats).flat().filter((m) => m.from === "kinly").length;
const busy = (d) => Object.values(d.pending).some(Boolean);
let seen = { elder: 0, family: 0, care: 0 };

/** Wait until Kinly has said something new and is no longer working. Then hold long enough to read it. */
async function kinlyAnswers(label, before) {
  const t0 = Date.now();
  let d = await chats();
  while (busy(d) || fromKinly(d) <= before) {
    if (Date.now() - t0 > REPLY_TIMEOUT) { note(`${label}: no reply from Kinly within ${REPLY_TIMEOUT / 1000} s`); break; }
    await sleep(400);
    d = await chats();
  }
  const added = [];
  for (const who of ["elder", "family", "care"]) {
    for (const m of d.chats[who].slice(seen[who])) added.push({ who, from: m.from, ...(m.sticker ? { sticker: m.sticker } : {}), ...(m.text ? { text: m.text } : {}), ...(m.image ? { image: true } : {}) });
    seen[who] = d.chats[who].length;
  }
  const today = await (await fetch(`${BASE}/api/today`)).json();
  beats.push({ beat, step: label, seconds: Math.round((Date.now() - t0) / 100) / 10, added, missionsDone: today.missions.filter((m) => m.done).map((m) => m.id), levels: today.events.map((e) => e.level) });
  for (const m of added) if (m.from === "kinly") console.log(`   ${m.who} <- ${m.sticker ? `[sticker ${m.sticker}]` : m.text.replace(/\n/g, " / ")}`);
  const chars = added.filter((m) => m.from === "kinly" && m.text).reduce((n, m) => n + m.text.length, 0);
  await hold(process.env.SLOW === "1" ? Math.max(2000, Math.min(8500, 1200 + chars * 32)) : 1000);
  return d;
}

async function says(who, text, { photo } = {}) {
  const before = fromKinly(await chats());
  if (photo) {
    await page.setInputFiles(`#file-${who}`, photo);
    await page.locator(`#picked-${who}`).waitFor({ state: "visible" });
    await hold(900);
  }
  await page.locator(`#text-${who}`).click();
  await type(`#text-${who}`, text);
  await hold(600);
  await page.locator(`#send-${who}`).click();
  await kinlyAnswers(`${who} says "${text}"`, before);
}

async function opens(who) {
  const before = fromKinly(await chats());
  await page.locator(`[data-start="${who}"]`).click();
  await kinlyAnswers(`${who} opens the link`, before);
}

try {
  // ---------- 1. Onboarding ----------
  beat = "1";
  if (DRY) {
    await page.route("**/api/read-meds", async (route) => {
      await sleep(2500);
      await route.fulfill({ json: { meds: [{ name: "NORVASC 5 MG TABLET", slots: ["morning"] }, { name: "GLUCOPHAGE 500 MG TABLET", slots: ["morning", "evening"] }], note: "(dry run) Two labels, both clear." } });
    });
  }
  const CAP1 = 104; // on /start the bottom-left corner holds the paw trail, so the caption sits above it
  await page.goto(`${BASE}/start`);
  await page.waitForFunction(() => document.getElementById("bubble").textContent.length > 0);
  await caption("1 · Anna sets Kinly up for her mom", CAP1);
  await hold(1800);
  await page.locator("label.choice", { hasText: "Someone I love" }).click();
  await hold();
  await type("#elderName", "Margaret", 70);
  await hold(700);
  await page.locator("#familyName").click();
  await type("#familyName", "Anna", 70);
  await hold(700);
  await page.locator("#relation label.chip", { hasText: /^Mom$/ }).click();
  await hold(700);
  await page.locator("#about").click();
  await type("#about", "Lives alone. Type 2 diabetes and high blood pressure. Loves her garden.", 24);
  await hold(1500);
  await page.locator('.step[data-step="0"] [data-next]').click();

  await caption("1 · What a day with Kinly looks like", CAP1);
  await hold(3500);
  await page.evaluate(() => window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" }));
  await hold(4000);
  await page.locator('.step[data-step="1"] [data-next]').click();

  await caption("1 · Kinly reads her medicines from the pharmacy label", CAP1);
  await hold(2000);
  const chooser = page.waitForEvent("filechooser");
  await page.locator('[data-read="meds"]').click();
  await (await chooser).setFiles(path.join(ROOT, "demo/sample-label.png"));
  const t0 = Date.now();
  try {
    await page.locator('#result[data-state="done"]').waitFor({ timeout: REPLY_TIMEOUT });
  } catch { note("Reading the label: no result within 60 s"); }
  const read = await page.locator("#resultList li").allInnerTexts();
  const medsNote = await page.locator("#resultNote").innerText();
  console.log(`   label read in ${Math.round((Date.now() - t0) / 1000)} s: ${read.map((x) => x.replace(/\s+/g, " ")).join(" | ")}\n   note: ${medsNote}`);
  if (read.length !== 2) note(`Reading the label: expected 2 medicines, the page lists ${read.length}`);
  beats.push({ beat, step: "Kinly reads the label", seconds: Math.round((Date.now() - t0) / 100) / 10, title: await page.locator("#resultTitle").innerText(), medicines: read.map((x) => x.replace(/\s+/g, " ")), note: medsNote });
  await hold(5000);
  await page.locator("#measures").evaluate((e) => e.scrollIntoView({ behavior: "smooth", block: "center" }));
  await hold(1800);
  await page.locator('[data-measure="glucose"] label.chip', { hasText: "Morning" }).click();
  await hold(1800);
  await page.locator('.step[data-step="2"] [data-next]').click();

  await caption("1 · A reminder Kinly will keep for her", CAP1);
  await hold(1500);
  await page.locator("#addNote").click();
  await type(".note input[type=text]", "Eye appointment with Dr. Lee", 40);
  const d = new Date(Date.now() + 86_400_000);
  const tomorrow = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}T10:00`;
  await page.locator(".note input[type=datetime-local]").fill(tomorrow);
  await hold(1800);
  await page.locator("#save").click();
  await page.locator('.step[data-step="4"]').waitFor({ state: "visible", timeout: 10_000 });
  await caption("1 · Kinly is ready: one link each for Margaret, family and the care team", CAP1);
  await hold(4500);

  // ---------- 2. Three phones ----------
  beat = "2";
  await page.goto(`${BASE}/demo`);
  await page.waitForFunction(() => document.getElementById("role-family").textContent.includes("Mom"), null, { timeout: 10_000 }).catch(() => note("The demo page did not show the names from the profile"));
  await caption("2 · Everyone opens their link");
  await hold(2500);
  await opens("family");
  await opens("care");
  await caption("2 · Margaret opens Kinly for the first time");
  await opens("elder");

  // ---------- 3. Morning pills, one missing ----------
  beat = "3";
  await caption("3 · Morning pills: Kinly asks");
  {
    const before = fromKinly(await chats());
    const res = await fetch(`${BASE}/nudge/meds_morning`, { signal: AbortSignal.timeout(REPLY_TIMEOUT) }).catch((e) => ({ ok: false, status: String(e) }));
    if (!res.ok) note(`/nudge/meds_morning answered ${res.status}`);
    await kinlyAnswers("Kinly nudges about the morning pills", before);
  }
  await caption("3 · Margaret shows her pills, but only one of the two");
  await says("elder", "Here are my morning pills", { photo: onePill });

  // ---------- 4. Both pills ----------
  beat = "4";
  await caption("4 · Margaret finds the other pill");
  await says("elder", "Found the other one", { photo: bothPills });

  // ---------- 5. Messages both ways ----------
  beat = "5";
  await caption("5 · Anna asks after her mom and sends a message");
  await says("family", "How's Mom doing today? Tell her I'll visit on Saturday.");
  await caption("5 · Margaret answers, through Kinly");
  await says("elder", "Tell Anna I can't wait, I'll make dumplings.");

  // ---------- 6. A red moment ----------
  beat = "6";
  await caption("6 · A red moment: Margaret feels dizzy, blood sugar 58");
  await says("elder", "I feel dizzy and shaky. My blood sugar says 58.");

  // ---------- 7. The care team answers ----------
  beat = "7";
  await caption("7 · The care team replies through Kinly");
  await says("care", "Thanks Kinly. Please ask her to drink half a glass of juice and recheck in 15 minutes. I'm calling her now.");
  await hold(2000);

  // ---------- 8. The family page ----------
  beat = "8";
  await page.goto(`${BASE}/family`);
  await page.waitForFunction(() => document.querySelectorAll(".mission").length > 0, null, { timeout: 10_000 }).catch(() => note("The family page showed no missions"));
  await caption("8 · Anna's family page: the day so far");
  await hold(3500);
  await page.evaluate(() => window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" }));
  await hold(3500);
} catch (err) {
  note(`The walkthrough stopped early: ${err.message.split("\n")[0]}`);
  console.error(err);
}

// ---------- Save what was said, then the video ----------

const final = await chats().catch(() => ({ chats: {} }));
const messages = Object.entries(final.chats)
  .flatMap(([who, list]) => list.map((m, i) => ({ time: m.time, chat: who, from: m.from === "me" ? who : "kinly", ...(m.sticker ? { sticker: m.sticker } : {}), ...(m.text ? { text: m.text } : {}), ...(m.image ? { image: `(photo, ${Math.round(m.image.length * 0.75 / 1024)} KB)` } : {}), i })))
  .sort((a, b) => a.time.localeCompare(b.time) || a.i - b.i)
  .map(({ i, ...m }) => m);
const today = await (await fetch(`${BASE}/api/today`)).json().catch(() => null);
fs.writeFileSync(path.join(OUT, "walkthrough-transcript.json"), JSON.stringify({
  recorded: new Date().toISOString(),
  dryRun: DRY,
  notes,
  messages,
  beats,
  familyPage: today && { missions: today.missions.map((m) => ({ id: m.id, time: m.time, title: m.title, done: m.done, asked: m.asked })), changes: today.changes, timeline: today.events.map(({ photo, ...e }) => e) },
}, null, 2));

const video = page.video();
await context.close();
await browser.close();
stop();
const webm = await video.path();
const mp4 = path.join(OUT, "walkthrough.mp4");
const fast = path.join(OUT, "walkthrough-2x.mp4");
execFileSync("ffmpeg", ["-loglevel", "error", "-y", "-i", webm, "-an", "-c:v", "libx264", "-preset", "medium", "-crf", "20", "-pix_fmt", "yuv420p", "-movflags", "+faststart", mp4]);
execFileSync("ffmpeg", ["-loglevel", "error", "-y", "-i", mp4, "-an", "-vf", "setpts=0.5*PTS", "-r", "30", "-c:v", "libx264", "-preset", "medium", "-crf", "21", "-pix_fmt", "yuv420p", "-movflags", "+faststart", fast]);

console.log(`\nVideo: ${mp4}\n2x:    ${fast}\nWords: ${path.join(OUT, "walkthrough-transcript.json")}\nServer log: ${path.join(STATE, "server.log")}`);
console.log(notes.length ? `\n${notes.length} thing(s) did not go as planned:\n${notes.map((n) => ` - beat ${n.beat}: ${n.note}`).join("\n")}` : "\nNo timeouts.");
process.exit(0);
