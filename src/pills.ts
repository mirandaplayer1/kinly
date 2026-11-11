// Pill appearance lookup from the Taiwan FDA open dataset (med/42_5.json).
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";

type PillRow = {
  許可證字號: string;
  中文品名: string;
  英文品名: string;
  形狀: string;
  顏色: string;
  刻痕: string;
  外觀尺寸: string;
  標註一: string | null;
  標註二: string | null;
  外觀圖檔連結: string | null;
};

const rows: PillRow[] = JSON.parse(readFileSync("./med/42_5.json", "utf8"));

export type Pill = {
  name: string;
  shape: string;
  color: string;
  scoreLine: string;
  sizeMm: string;
  imprint: string;
  imageUrl: string | null;
};

// Reference photos are downloaded once and kept in med/ref, then sent to the model as image data.
const refCache = new Map<string, { data: string; mediaType: "image/png" | "image/jpeg" } | null>();

export async function referencePhoto(pill: Pill): Promise<{ data: string; mediaType: "image/png" | "image/jpeg" } | null> {
  if (!pill.imageUrl) return null;
  const hit = refCache.get(pill.imageUrl);
  if (hit !== undefined) return hit;
  const file = `med/ref/${pill.name.replace(/[^A-Za-z0-9]+/g, "_")}`;
  try {
    let buf: Buffer;
    if (existsSync(file)) {
      buf = readFileSync(file);
    } else {
      const res = await fetch(pill.imageUrl);
      if (!res.ok) throw new Error(`${res.status}`);
      buf = Buffer.from(await res.arrayBuffer());
      mkdirSync("med/ref", { recursive: true });
      writeFileSync(file, buf);
      // Originals can be 16 MB. Keep a small JPEG instead (sips ships with macOS; skipped elsewhere).
      try {
        execFileSync("sips", ["-Z", "800", "-s", "format", "jpeg", "-s", "formatOptions", "80", file, "--out", file], { stdio: "ignore" });
        buf = readFileSync(file);
      } catch {}
    }
    const mediaType = buf[0] === 0xff ? "image/jpeg" : "image/png";
    const out = { data: buf.toString("base64"), mediaType } as const;
    refCache.set(pill.imageUrl, out);
    return out;
  } catch (err) {
    console.error(`Reference photo for ${pill.name} unavailable:`, err);
    refCache.set(pill.imageUrl, null);
    return null;
  }
}

/** Find a pill by its exact English product name, e.g. "NORVASC TABLETS 5MG". */
export function findPill(englishName: string): Pill {
  const row = rows.find((r) => r.英文品名?.toUpperCase() === englishName.toUpperCase());
  if (!row) throw new Error(`Pill not found in TFDA data: ${englishName}`);
  return {
    name: row.英文品名,
    shape: row.形狀,
    color: row.顏色,
    scoreLine: row.刻痕,
    sizeMm: row.外觀尺寸,
    imprint: [row.標註一, row.標註二].filter(Boolean).join(" / "),
    imageUrl: row.外觀圖檔連結,
  };
}

/**
 * Find the reference pill for a name read off a label or typed by the family.
 * A wrong reference photo is worse than none, so a name that fits several different products
 * (a generic made by many companies, say) gets no reference at all.
 */
export function softFindPill(name: string): Pill | null {
  const want = name.trim().toUpperCase();
  if (!want) return null;
  const names = rows.map((r) => r.英文品名).filter(Boolean);
  const only = (list: string[]) => (new Set(list).size === 1 ? findPill(list[0]) : null);

  const exact = names.filter((n) => n.toUpperCase() === want);
  if (exact.length) return only(exact);
  const prefix = names.filter((n) => n.toUpperCase().startsWith(want));
  if (prefix.length) return only(prefix);

  // A label says "NORVASC 5 MG TABLET"; the dataset says "NORVASC TABLETS 5MG". Match the brand, then the strength.
  const [brand, ...rest] = want.split(/\s+/);
  const strength = rest.join("").match(/\d+(?:\.\d+)?MG/)?.[0];
  const sameBrand = names.filter((n) => n.toUpperCase().split(/[\s"]+/)[0] === brand);
  const sameStrength = strength ? sameBrand.filter((n) => n.toUpperCase().replace(/\s+/g, "").includes(strength)) : [];
  if (sameStrength.length) return only(sameStrength);
  // Some product names leave the strength out, but the tablet is stamped with it ("GL 500").
  const digits = strength?.replace("MG", "");
  const stamped = digits
    ? rows.filter((r) => sameBrand.includes(r.英文品名) && `${r.標註一 ?? ""} ${r.標註二 ?? ""}`.replace(/\s+/g, "").includes(digits)).map((r) => r.英文品名)
    : [];
  return only(stamped.length ? stamped : sameBrand);
}

/** Find a pill by the marking stamped on it, e.g. "GL 500" or "D2 / 850". Null unless exactly one product carries it. */
export function findByImprint(imprint: string): Pill | null {
  const norm = (s: string) => s.toUpperCase().replace(/[^A-Z0-9]/g, "");
  const want = norm(imprint);
  if (want.length < 3) return null;
  const hits = rows.filter((r) => {
    const a = norm(r.標註一 ?? ""), b = norm(r.標註二 ?? "");
    return want === a + b || want === b + a || (a.length >= 3 && want === a && !b) || (b.length >= 3 && want === b && !a);
  });
  return new Set(hits.map((r) => r.英文品名)).size === 1 ? findPill(hits[0].英文品名) : null;
}
