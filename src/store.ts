// Today's care log, kept in memory. Kinly reads it for context; the family page shows it.
export type Level = "green" | "yellow" | "red";
export type Kind = "pills" | "glucose" | "blood_pressure" | "meal" | "clock" | "chat" | "call";

export type CareEvent = {
  time: string; // ISO
  kind: Kind;
  level: Level;
  summary: string; // one line, written for the family
  photo?: string; // data URL of what the elder sent
};

const events: CareEvent[] = [];

export function addEvent(e: Omit<CareEvent, "time">): CareEvent {
  const event = { ...e, time: new Date().toISOString() };
  events.push(event);
  return event;
}

export function todaysEvents(): CareEvent[] {
  return events;
}

/** Plain-text log for the model, without photos. */
export function logForModel(): string {
  if (events.length === 0) return "(nothing logged yet today)";
  return events
    .map((e) => `${new Date(e.time).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })} [${e.kind}/${e.level}] ${e.summary}`)
    .join("\n");
}
