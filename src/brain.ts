// One door to the model. Gemini when GEMINI_API_KEY is set (it watches video and hears audio);
// Claude otherwise (photos only).
import Anthropic from "@anthropic-ai/sdk";

export type Part =
  | { text: string }
  | { image: { data: string; mediaType: string } }
  | { video: { data: string; mediaType: string } };

const GEMINI_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL;
export const brainName = GEMINI_KEY ? `Gemini (${GEMINI_MODEL})` : "Claude (claude-opus-5-5)";
export const seesVideo = Boolean(GEMINI_KEY);

// Our schemas are plain JSON Schema. Gemini's responseSchema wants upper-case types and `nullable`.
function toGemini(schema: any): any {
  if (Array.isArray(schema)) return schema.map(toGemini);
  if (!schema || typeof schema !== "object") return schema;
  const out: any = {};
  for (const [k, v] of Object.entries(schema)) {
    if (k === "additionalProperties") continue;
    if (k === "type") {
      const types = Array.isArray(v) ? v : [v];
      out.type = String(types.find((t) => t !== "null")).toUpperCase();
      if (types.includes("null")) out.nullable = true;
    } else if (k === "properties") {
      out.properties = Object.fromEntries(Object.entries(v as object).map(([name, s]) => [name, toGemini(s)]));
    } else if (k === "items") {
      out.items = toGemini(v);
    } else {
      out[k] = v;
    }
  }
  return out;
}

async function askGemini<T>(system: string, schema: object, parts: Part[]): Promise<T | null> {
  if (!GEMINI_MODEL) throw new Error("Set GEMINI_MODEL in .env");
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": GEMINI_KEY! },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents: [
        {
          role: "user",
          parts: parts.map((p) =>
            "text" in p
              ? { text: p.text }
              : "image" in p
                ? { inlineData: { mimeType: p.image.mediaType, data: p.image.data } }
                : { inlineData: { mimeType: p.video.mediaType, data: p.video.data } },
          ),
        },
      ],
      generationConfig: { responseMimeType: "application/json", responseSchema: toGemini(schema) },
    }),
  });
  const body = (await res.json()) as any;
  if (!res.ok) throw new Error(`Gemini ${res.status}: ${body?.error?.message ?? JSON.stringify(body).slice(0, 300)}`);
  const text: string | undefined = body.candidates?.[0]?.content?.parts?.map((p: any) => p.text ?? "").join("");
  if (!text) return null; // blocked or empty
  return JSON.parse(text) as T;
}

const claude = process.env.ANTHROPIC_API_KEY ? new Anthropic() : undefined;

async function askClaude<T>(system: string, schema: object, parts: Part[]): Promise<T | null> {
  const content: Anthropic.Beta.BetaContentBlockParam[] = parts.map((p) =>
    "text" in p
      ? { type: "text", text: p.text }
      : "image" in p
        ? { type: "image", source: { type: "base64", media_type: p.image.mediaType as "image/jpeg", data: p.image.data } }
        : { type: "text", text: "(She sent a video. You cannot watch video; tell her so and ask for a photo instead.)" },
  );
  const response = await claude!.beta.messages.create({
    model: "claude-opus-5-5",
    max_tokens: 8000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: { effort: "low", format: { type: "json_schema", schema: schema as Record<string, unknown> } },
    system,
    messages: [{ role: "user", content }],
  });
  const text = response.content
    .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");
  if (response.stop_reason === "refusal" || !text) return null;
  return JSON.parse(text) as T;
}

/**
 * Ask the model for one structured answer. Null means it declined or returned nothing.
 * If Gemini is unreachable (no credit, outage) and Claude is configured, Claude answers instead,
 * so Kinly keeps talking; it just cannot watch video until Gemini is back.
 */
export async function ask<T>(system: string, schema: object, parts: Part[]): Promise<T | null> {
  if (!GEMINI_KEY) return askClaude<T>(system, schema, parts);
  try {
    return await askGemini<T>(system, schema, parts);
  } catch (err) {
    if (!claude) throw err;
    console.error(`${(err as Error).message}\n   -> answering with Claude instead`);
    return askClaude<T>(system, schema, parts);
  }
}
