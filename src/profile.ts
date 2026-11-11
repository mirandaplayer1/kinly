// What the family set up at onboarding (profile), and what Kinly remembers (state).
// Both live in .kinly/ as JSON so they survive restarts. Everything here can be edited again at /start.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";

export type Slot = "morning" | "noon" | "evening" | "bedtime";
export const SLOTS: Slot[] = ["morning", "noon", "evening", "bedtime"];

export type Profile = {
  elderName: string; // what Kinly calls her
  familyName: string; // who set Kinly up
  about: string; // anything Kinly should know: conditions, lives alone, likes
  tasks: {
    activity: { on: boolean; time: string; what: string };
    meals: { on: boolean; breakfast: string; lunch: string; dinner: string };
    meds: { on: boolean; list: { name: string; slots: Slot[] }[]; times: Record<Slot, string> };
    measure: { glucose: Slot[]; pressure: Slot[] }; // when Kinly asks for a reading; empty means never
    remember: { on: boolean };
    journal: { on: boolean; time: string };
  };
};

export const DEFAULT_PROFILE: Profile = {
  elderName: "Mom",
  familyName: "Anna",
  about: "Type 2 diabetes and high blood pressure. Lives alone.",
  tasks: {
    activity: { on: true, time: "10:00", what: "a walk" },
    meals: { on: true, breakfast: "08:30", lunch: "12:30", dinner: "18:30" },
    meds: {
      on: true,
      list: [
        { name: "NORVASC TABLETS 5MG", slots: ["morning"] },
        { name: "GLUCOPHAGE TABLETS", slots: ["morning", "evening"] },
      ],
      times: { morning: "08:00", noon: "12:00", evening: "18:00", bedtime: "21:30" },
    },
    measure: { glucose: [], pressure: [] },
    remember: { on: true },
    journal: { on: true, time: "20:30" },
  },
};

export type Memory = { note: string; remindAt: string | null; told: boolean; day: string };
export type Observation = { day: string; kind: string; note: string };

export type State = {
  elder?: string; // her chat address, e.g. "tg:123"
  family: string[];
  care: string[];
  day: string; // the day `done` and `asked` belong to
  done: string[]; // mission ids finished today
  asked: string[]; // mission ids Kinly already brought up today
  streaks: Record<string, { count: number; last: string }>; // by mission kind
  memories: Memory[];
  observations: Observation[]; // what Kinly noticed, kept across days to see change
};

const DIR = ".kinly";
const read = <T>(name: string): T | null =>
  existsSync(`${DIR}/${name}`) ? (JSON.parse(readFileSync(`${DIR}/${name}`, "utf8")) as T) : null;
const write = (name: string, value: unknown) => {
  mkdirSync(DIR, { recursive: true });
  writeFileSync(`${DIR}/${name}`, JSON.stringify(value, null, 2));
};

export const today = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
export const clock = (d = new Date()) => `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;

let profile = read<Profile>("profile.json");
if (profile && !profile.tasks.measure) profile.tasks.measure = { glucose: [], pressure: [] }; // saved before measurements existed
export const onboarded = () => profile !== null;
export const getProfile = (): Profile => profile ?? DEFAULT_PROFILE;
export function saveProfile(p: Profile) {
  profile = p;
  write("profile.json", p);
}

const state: State = read<State>("state.json") ?? { family: [], care: [], day: today(), done: [], asked: [], streaks: {}, memories: [], observations: [] };
if (!state.elder && existsSync(".kinly-elder")) state.elder = readFileSync(".kinly-elder", "utf8").trim();

/** Today's state. A new day clears what was done and asked. */
export function getState(): State {
  if (state.day !== today()) {
    state.day = today();
    state.done = [];
    state.asked = [];
  }
  return state;
}
export const saveState = () => write("state.json", state);
