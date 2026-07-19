import type { TimeEntry } from "../api";

export function currentTimeEntryDurationSeconds(entry: TimeEntry): number {
  const startedAt = Date.parse(entry.started_at);
  const endedAt = entry.ended_at ? Date.parse(entry.ended_at) : Date.now();
  const elapsedSeconds = Math.max(0, Math.floor((endedAt - startedAt) / 1000));

  return Math.max(0, elapsedSeconds + entry.seconds_adjustment);
}
