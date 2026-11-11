// Pill appearance lookup from the Taiwan FDA open dataset (med/42_5.json).
import { readFileSync } from "node:fs";

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
