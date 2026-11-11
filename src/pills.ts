// Pill appearance lookup from the Taiwan FDA open dataset (med/42_5.json).
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
  return only(sameStrength.length ? sameStrength : sameBrand);
}
