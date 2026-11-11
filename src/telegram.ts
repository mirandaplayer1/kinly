// Telegram channel: long polling, so no public URL is needed for messages.
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const API = `https://api.telegram.org/bot${TOKEN}`;

export const telegramOn = Boolean(TOKEN);
export let botUsername = "";

async function call(method: string, body: Record<string, unknown> | FormData) {
  const res = await fetch(`${API}/${method}`, body instanceof FormData
    ? { method: "POST", body }
    : { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const out = (await res.json()) as { ok: boolean; result?: any; description?: string };
  if (!out.ok) throw new Error(`Telegram ${method}: ${out.description}`);
  return out.result;
}

const chatId = (to: string) => to.replace("tg:", "");

export const tgText = (to: string, text: string) => call("sendMessage", { chat_id: chatId(to), text });

export async function tgSticker(to: string, file: string) {
  const form = new FormData();
  form.set("chat_id", chatId(to));
  form.set("sticker", new Blob([readFileSync(file)], { type: "image/webp" }), "kinly.webp");
  return call("sendSticker", form);
}

export type TgMedia = { kind: "image" | "video"; data: string; mediaType: string };
export type TgIncoming = {
  from: string; // "tg:<chat id>"
  text: string;
  start?: string; // the payload of a /start deep link, e.g. "family"
  media?: TgMedia;
  tooBig?: boolean; // she sent a file Telegram would not let a bot download
};

async function download(fileId: string): Promise<Buffer> {
  const file = await call("getFile", { file_id: fileId });
  const res = await fetch(`https://api.telegram.org/file/bot${TOKEN}/${file.file_path}`);
  if (!res.ok) throw new Error(`Telegram download failed: ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

// Big videos are shrunk so they fit in one model request; sound is kept.
function shrink(video: Buffer): Buffer {
  const dir = mkdtempSync(join(tmpdir(), "kinly-"));
  try {
    writeFileSync(join(dir, "in.mp4"), video);
    execFileSync("ffmpeg", ["-loglevel", "error", "-y", "-i", join(dir, "in.mp4"), "-t", "60", "-vf", "scale=-2:480,fps=12", "-c:v", "libx264", "-crf", "30", "-preset", "veryfast", "-c:a", "aac", "-b:a", "48k", join(dir, "out.mp4")]);
    return readFileSync(join(dir, "out.mp4"));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

const BOT_LIMIT = 20 * 1024 * 1024; // Telegram lets bots download files up to 20 MB

async function mediaOf(m: any): Promise<{ media?: TgMedia; tooBig?: boolean }> {
  const video = m.video ?? m.video_note ?? m.animation;
  if (video) {
    if ((video.file_size ?? 0) > BOT_LIMIT) return { tooBig: true };
    let buf = await download(video.file_id);
    if (buf.length > 6 * 1024 * 1024) buf = shrink(buf);
    return { media: { kind: "video", data: buf.toString("base64"), mediaType: "video/mp4" } };
  }
  const sizes: any[] | undefined = m.photo;
  if (sizes?.length) {
    // The largest size up to ~1600px keeps it sharp without being heavy.
    const pick = [...sizes].reverse().find((s) => Math.max(s.width, s.height) <= 1600) ?? sizes[sizes.length - 1];
    return { media: { kind: "image", data: (await download(pick.file_id)).toString("base64"), mediaType: "image/jpeg" } };
  }
  return {};
}

export async function tgListen(onMessage: (m: TgIncoming) => Promise<void>) {
  const me = await call("getMe", {});
  botUsername = me.username;
  console.log(`Telegram: on as @${me.username}`);
  let offset = 0;
  for (;;) {
    try {
      const updates: any[] = await call("getUpdates", { offset, timeout: 25, allowed_updates: ["message"] });
      for (const u of updates) {
        offset = u.update_id + 1;
        const m = u.message;
        if (!m) continue;
        const from = `tg:${m.chat.id}`;
        const text: string = m.text ?? m.caption ?? "";
        const start = /^\/start(?:\s+(\S+))?$/.exec(text);
        (async () => {
          if (start) return onMessage({ from, text: "", start: start[1] ?? "" });
          return onMessage({ from, text, ...(await mediaOf(m)) });
        })().catch(console.error);
      }
    } catch (err) {
      console.error(err);
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
}
