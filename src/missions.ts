// Today's little missions, built from what the family switched on at onboarding.
// Kinly brings them up one at a time, at their time, and she answers with a photo or a video.
import { getProfile, getState, saveState, today, SLOTS, type Profile } from "./profile.js";

export type Mission = {
  id: string; // e.g. "meds_morning"
  kind: "meds" | "meal" | "activity" | "journal";
  title: string; // for the family page
  time: string; // "HH:MM"
  ask: string; // what Kinly is after, told to the model
};

export function todaysMissions(p: Profile = getProfile()): Mission[] {
  const t = p.tasks;
  const out: Mission[] = [];
  if (t.meds.on) {
    for (const slot of SLOTS) {
      const pills = t.meds.list.filter((m) => m.slots.includes(slot)).map((m) => m.name);
      if (pills.length === 0) continue;
      out.push({
        id: `meds_${slot}`,
        kind: "meds",
        title: `${slot[0].toUpperCase()}${slot.slice(1)} pills`,
        time: t.meds.times[slot],
        ask: `Her ${slot} pills: ${pills.join(", ")}. Ask her to show you the pills in her hand, or the bottles, in a photo or a short video.`,
      });
    }
  }
  if (t.meals.on) {
    for (const meal of ["breakfast", "lunch", "dinner"] as const) {
      out.push({
        id: `meal_${meal}`,
        kind: "meal",
        title: meal[0].toUpperCase() + meal.slice(1),
        time: t.meals[meal],
        ask: `Her ${meal}. You are curious what she is having; ask for a photo of the plate.`,
      });
    }
  }
  if (t.activity.on) {
    out.push({
      id: "activity",
      kind: "activity",
      title: `Activity: ${t.activity.what}`,
      time: t.activity.time,
      ask: `Today's activity: ${t.activity.what}. Invite her, and ask for a short video or a photo from it, something she sees or a few steps of her walking.`,
    });
  }
  if (t.journal.on) {
    out.push({
      id: "journal",
      kind: "journal",
      title: "Today's moment",
      time: t.journal.time,
      ask: "The daily record: ask for one photo or a short video of something from today she wants to keep, or a few words about her day.",
    });
  }
  return out.sort((a, b) => a.time.localeCompare(b.time));
}

export type MissionStatus = Mission & { done: boolean; asked: boolean; streak: number };

export function missionStatus(): MissionStatus[] {
  const s = getState();
  return todaysMissions().map((m) => ({
    ...m,
    done: s.done.includes(m.id),
    asked: s.asked.includes(m.id),
    streak: s.streaks[m.kind]?.count ?? 0,
  }));
}

/** Mark a mission done. Returns the streak in days for that kind of mission. */
export function completeMission(id: string): number {
  const s = getState();
  const m = todaysMissions().find((x) => x.id === id);
  if (!m) return 0;
  if (!s.done.includes(id)) s.done.push(id);
  const streak = s.streaks[m.kind] ?? { count: 0, last: "" };
  if (streak.last !== today()) {
    const yesterday = today(new Date(Date.now() - 86_400_000));
    streak.count = streak.last === yesterday ? streak.count + 1 : 1;
    streak.last = today();
    s.streaks[m.kind] = streak;
  }
  saveState();
  return streak.count;
}

export function markAsked(id: string) {
  const s = getState();
  if (!s.asked.includes(id)) s.asked.push(id);
  saveState();
}
