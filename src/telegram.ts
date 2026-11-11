// Telegram channel: long polling, so no public URL is needed for messages.
import { readFileSync } from "node:fs";

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const API = `https://api.telegram.org/bot${TOKEN}`;

export const telegramOn = Boolean(TOKEN);

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

export async function tgPicture(to: string, caption: string, file: string) {
  const form = new FormData();
  form.set("chat_id", chatId(to));
  form.set("caption", caption);
  form.set("photo", new Blob([readFileSync(file)], { type: "image/png" }), "kinly.png");
  return call("sendPhoto", form);
}

export type TgIncoming = {
  from: string; // "tg:<chat id>"
  text: string;
  image?: { data: string; mediaType: "image/jpeg" };
};

async function photoOf(message: any): Promise<TgIncoming["image"]> {
  const sizes: any[] | undefined = message.photo;
  if (!sizes?.length) return undefined;
  // Largest size under ~1600px keeps it sharp without being heavy.
  const pick = [...sizes].reverse().find((s) => Math.max(s.width, s.height) <= 1600) ?? sizes[sizes.length - 1];
  const file = await call("getFile", { file_id: pick.file_id });
  const res = await fetch(`https://api.telegram.org/file/bot${TOKEN}/${file.file_path}`);
  if (!res.ok) throw new Error(`Telegram photo download failed: ${res.status}`);
  return { data: Buffer.from(await res.arrayBuffer()).toString("base64"), mediaType: "image/jpeg" };
}

export async function tgListen(onMessage: (m: TgIncoming) => Promise<void>) {
  const me = await call("getMe", {});
  console.log(`Telegram: on as @${me.username}`);
  let offset = 0;
  for (;;) {
    try {
      const updates: any[] = await call("getUpdates", { offset, timeout: 25, allowed_updates: ["message"] });
      for (const u of updates) {
        offset = u.update_id + 1;
        const m = u.message;
        if (!m) continue;
        const text: string = m.text ?? m.caption ?? "";
        if (text === "/start") {
          await tgText(`tg:${m.chat.id}`, "Hi, I'm Kinly 🐱 Say hello, or send me a photo of anything.");
          continue;
        }
        const incoming: TgIncoming = { from: `tg:${m.chat.id}`, text, image: await photoOf(m) };
        onMessage(incoming).catch(console.error);
      }
    } catch (err) {
      console.error(err);
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
}
