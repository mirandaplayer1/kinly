// One Gemini TTS request per line (8 total, no retries). Run from repo root: node video/glasses/tts.mjs
import "dotenv/config";
import { writeFileSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
const KEY = process.env.GEMINI_API_KEY, MODEL = "gemini-3.8-flash-tts", DIR = "video/glasses/audio";
const K = { voice: "Sulafat", style: "Say this in a warm, light, friendly voice, at a relaxed pace" };
const H = { voice: "Gacrux", style: "Say this as a calm woman in her seventies, unhurried and gentle" };
export const LINES = [
  ["s1_her", H, "Kinly, I'm making my scallion pancakes. Save the recipe for Anna."],
  ["s1_kinly", K, "Recording. Two cups of flour so far. I'll write it down as you go."],
  ["s2_kinly_a", K, "That's the evening one. Morning is the white eight-sided tablet."],
  ["s2_kinly_b", K, "That's it. Take it with breakfast."],
  ["s3_kinly_a", K, "It's ten and the sun is out. Walk with me?"],
  ["s3_her", H, "Just to the corner."],
  ["s3_kinly_b", K, "The corner is perfect. Five days in a row."],
];
for (const [id, v, text] of LINES) {
  const wav = `${DIR}/${id}.wav`;
  if (existsSync(wav)) { console.log("skip", id); continue; }
  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
    method: "POST", headers: { "x-goog-api-key": KEY, "content-type": "application/json" },
    body: JSON.stringify({ contents: [{ parts: [{ text: `${v.style}: ${text}` }] }],
      generationConfig: { responseModalities: ["AUDIO"], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: v.voice } } } } }),
  });
  const j = await r.json();
  const p = j.candidates?.[0]?.content?.parts?.find((x) => x.inlineData);
  if (!p) { console.log("FAIL", id, r.status, String(j.error?.message ?? JSON.stringify(j)).slice(0, 300)); continue; }
  const rate = /rate=(\d+)/.exec(p.inlineData.mimeType)?.[1] ?? "24000";
  writeFileSync(`${DIR}/${id}.pcm`, Buffer.from(p.inlineData.data, "base64"));
  execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-f", "s16le", "-ar", rate, "-ac", "1", "-i", `${DIR}/${id}.pcm`, wav]);
  console.log("ok", id, p.inlineData.mimeType);
}
