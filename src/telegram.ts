// Telegram channel: long polling, so no public URL is needed for messages.
//
// Normally one Kinly bot serves everyone, and each person joins with their own account.
// For a demo with a single Telegram account, two more bots can stand in for the family's phone
// and the care team's phone (TELEGRAM_FAMILY_BOT_TOKEN, TELEGRAM_CARE_BOT_TOKEN). An address says
// which bot a chat lives in: "tg:<chat>" (main), "tgf:<chat>" (family bot), "tgc:<chat>" (care bot).
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

export type Via = "main" | "family" | "care";
type Bot = { via: Via; prefix: string; token: string; username: string };

const bots: Bot[] = (
  [
    { via: "main", prefix: "tg", token: process.env.TELEGRAM_BOT_TOKEN },
    { via: "family", prefix: "tgf", token: process.env.TELEGRAM_FAMILY_BOT_TOKEN },
    { via: "care", prefix: "tgc", token: process.env.TELEGRAM_CARE_BOT_TOKEN },
  ] as const
)
  .filter((b) => b.token)
  .map((b) => ({ ...b, token: b.token!, username: "" }));

export const telegramOn = bots.some((b) => b.via === "main");
export const botUsername = (via: Via = "main") => bots.find((b) => b.via === via)?.username ?? "";
export const hasBot = (via: Via) => bots.some((b) => b.via === via);

function botFor(address: string): { bot: Bot; chat: string } {
  const [prefix, chat] = address.split(":");
  const bot = bots.find((b) => b.prefix === prefix);
  if (!bot) throw new Error(`No Telegram bot configured for ${address}`);
  return { bot, chat };
}

async function call(bot: Bot, method: string, body: Record<string, unknown> | FormData) {
  const res = await fetch(`https://api.telegram.org/bot${bot.token}/${method}`, body instanceof FormData
    ? { method: "POST", body }
    : { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const out = (await res.json()) as { ok: boolean; result?: any; description?: string };
  if (!out.ok) throw new Error(`Telegram ${method}: ${out.description}`);
  return out.result;
}

export function tgText(to: string, text: string) {
  const { bot, chat } = botFor(to);
  return call(bot, "sendMessage", { chat_id: chat, text });
}

export function tgSticker(to: string, file: string) {
  const { bot, chat } = botFor(to);
  const form = new FormData();
  form.set("chat_id", chat);
  form.set("sticker", new Blob([readFileSync(file)], { type: "image/webp" }), "kinly.webp");
  return call(bot, "sendSticker", form);
}

export type TgMedia = { kind: "image" | "video"; data: string; mediaType: string };
export type TgIncoming = {
  from: string; // the chat's address, e.g. "tg:123"
  via: Via; // which bot it came through
  text: string;
  start?: string; // the payload of a /start deep link, e.g. "family"
  media?: TgMedia;
  tooBig?: boolean; // she sent a file Telegram would not let a bot download
};

async function download(bot: Bot, fileId: string): Promise<Buffer> {
  const file = await call(bot, "getFile", { file_id: fileId });
  const res = await fetch(`https://api.telegram.org/file/bot${bot.token}/${file.file_path}`);
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

async function mediaOf(bot: Bot, m: any): Promise<{ media?: TgMedia; tooBig?: boolean }> {
  const video = m.video ?? m.video_note ?? m.animation;
  if (video) {
    if ((video.file_size ?? 0) > BOT_LIMIT) return { tooBig: true };
    let buf = await download(bot, video.file_id);
    if (buf.length > 6 * 1024 * 1024) buf = shrink(buf);
    return { media: { kind: "video", data: buf.toString("base64"), mediaType: "video/mp4" } };
  }
  const sizes: any[] | undefined = m.photo;
  if (sizes?.length) {
    // The largest size up to ~1600px keeps it sharp without being heavy.
    const pick = [...sizes].reverse().find((s) => Math.max(s.width, s.height) <= 1600) ?? sizes[sizes.length - 1];
    return { media: { kind: "image", data: (await download(bot, pick.file_id)).toString("base64"), mediaType: "image/jpeg" } };
  }
  return {};
}

async function listen(bot: Bot, onMessage: (m: TgIncoming) => Promise<void>) {
  const me = await call(bot, "getMe", {});
  bot.username = me.username;
  console.log(`Telegram: @${me.username} (${bot.via === "main" ? "Kinly" : `stands in for the ${bot.via === "family" ? "family's" : "care team's"} phone`})`);
  let offset = 0;
  for (;;) {
    try {
      const updates: any[] = await call(bot, "getUpdates", { offset, timeout: 25, allowed_updates: ["message"] });
      for (const u of updates) {
        offset = u.update_id + 1;
        const m = u.message;
        if (!m) continue;
        const from = `${bot.prefix}:${m.chat.id}`;
        const text: string = m.text ?? m.caption ?? "";
        const start = /^\/start(?:\s+(\S+))?$/.exec(text);
        (async () => {
          if (start) return onMessage({ from, via: bot.via, text: "", start: start[1] ?? "" });
          return onMessage({ from, via: bot.via, text, ...(await mediaOf(bot, m)) });
        })().catch(console.error);
      }
    } catch (err) {
      console.error(err);
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
}

export function tgListen(onMessage: (m: TgIncoming) => Promise<void>) {
  for (const bot of bots) listen(bot, onMessage).catch(console.error);
}
