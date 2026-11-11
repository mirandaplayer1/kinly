// Demo patient and medication schedule. Later this comes from a photo of the pharmacy bag.
import { findPill, type Pill } from "./pills.js";

export type Dose = { pill: Pill; count: number; purpose: string };
export type Slot = "morning" | "noon" | "evening" | "bedtime";
const SLOTS: Slot[] = ["morning", "noon", "evening", "bedtime"];

export const patient = {
  name: "Mom",
  conditions: "type 2 diabetes, high blood pressure. Lives alone.",
  schedule: {
    morning: [
      { pill: findPill("NORVASC TABLETS 5MG"), count: 1, purpose: "blood pressure" },
      { pill: findPill("GLUCOPHAGE TABLETS"), count: 1, purpose: "blood sugar" },
    ],
    noon: [],
    evening: [{ pill: findPill("GLUCOPHAGE TABLETS"), count: 1, purpose: "blood sugar" }],
    bedtime: [],
  } satisfies Record<Slot, Dose[]>,
};

/** Current dose slot by local hour. Set DEMO_SLOT=morning to pin it while recording. */
export function currentSlot(now = new Date()): Slot {
  const pinned = process.env.DEMO_SLOT as Slot | undefined;
  if (pinned && SLOTS.includes(pinned)) return pinned;
  const h = now.getHours();
  if (h < 11) return "morning";
  if (h < 16) return "noon";
  if (h < 21) return "evening";
  return "bedtime";
}
