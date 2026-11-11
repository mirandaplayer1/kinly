// Renders video/glasses/index.html to demo/glasses-concept.mp4 by stepping time (deterministic frame capture).
// Run from repo root: node video/glasses/render.mjs [--stills <dir>]   (stills only: a few preview frames, no video)
import { chromium } from "playwright-core";
import { mkdirSync, rmSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const FPS = 30, ROOT = resolve("."), SRC = resolve("video/glasses"), OUT = resolve("demo");
const args = process.argv.slice(2), stillsDir = args[0] === "--stills" ? resolve(args[1]) : null;
const frames = resolve(process.env.FRAMES_DIR ?? "video/glasses/.frames");

const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 1 });
page.on("pageerror", (e) => console.error("PAGE ERROR", e.message));
await page.goto(pathToFileURL(`${SRC}/index.html`).href + "?capture=1");
await page.evaluate(async () => { await document.fonts.ready; await Promise.all([...document.images].map((i) => i.decode().catch(() => {}))); });
await page.evaluate(() => Promise.all(["600 34px 'Bricolage Grotesque'", "700 92px 'Bricolage Grotesque'", "500 25px 'Bricolage Grotesque'", "600 18px Geist", "500 18px Geist"].map((f) => document.fonts.load(f))));
const TL = await page.evaluate(() => window.TL);
const shot = async (t, path, type = "png") => { await page.evaluate((x) => window.renderAt(x), t); await page.screenshot({ path, type, ...(type === "jpeg" ? { quality: 96 } : {}) }); };

if (stillsDir) {
  mkdirSync(stillsDir, { recursive: true });
  const ts = args[2] ? args[2].split(",").map(Number) : [3, 11.3, 14.6, 20, 25.2, 31.5, 33, 36];
  for (const t of ts) await shot(t, `${stillsDir}/t${String(t).replace(".", "_")}.png`);
  await browser.close(); process.exit(0);
}

rmSync(frames, { recursive: true, force: true }); mkdirSync(frames, { recursive: true }); mkdirSync(OUT, { recursive: true });
const N = Math.round(TL.TOTAL * FPS);
for (let i = 0; i < N; i++) await shot(i / FPS, `${frames}/f${String(i).padStart(5, "0")}.jpg`, "jpeg");
for (const k of [1, 2, 3]) await shot(TL.STILLS[k], `${OUT}/glasses-scene-${k}.png`);
await browser.close();

// one audio track: each clip delayed to its cue time, no music
const inputs = TL.CUES.flatMap((c) => ["-i", `${SRC}/audio/${c.id}.wav`]);
const filt = TL.CUES.map((c, i) => `[${i + 1}:a]adelay=${Math.round(c.at * 1000)}:all=1[a${i}]`).join(";") +
  `;${TL.CUES.map((_, i) => `[a${i}]`).join("")}amix=inputs=${TL.CUES.length}:normalize=0,apad[a]`;
execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-framerate", String(FPS), "-i", `${frames}/f%05d.jpg`, ...inputs,
  "-filter_complex", filt, "-map", "0:v", "-map", "[a]", "-c:v", "libx264", "-preset", "slow", "-crf", "17", "-pix_fmt", "yuv420p",
  "-c:a", "aac", "-b:a", "160k", "-ar", "48000", "-t", String(TL.TOTAL), "-movflags", "+faststart", `${OUT}/glasses-concept.mp4`], { stdio: "inherit" });
rmSync(frames, { recursive: true, force: true });
console.log("wrote", `${OUT}/glasses-concept.mp4`, N, "frames");
