import { useEffect, useRef, useState } from "react";

import type { TimeEntry } from "../api";

interface DurationSnapshot {
  baseDurationSeconds: number;
  capturedAtMs: number;
  isStopped: boolean;
}

export function useLiveTimeEntryDuration(entry: TimeEntry | null): number {
  const [durationSeconds, setDurationSeconds] = useState(entry?.duration_seconds ?? 0);
  const snapshotRef = useRef<DurationSnapshot | null>(null);

  useEffect(() => {
    if (!entry) {
      snapshotRef.current = null;
      setDurationSeconds(0);
      return;
    }

    snapshotRef.current = {
      baseDurationSeconds: Math.max(0, Math.floor(entry.duration_seconds)),
      capturedAtMs: Date.now(),
      isStopped: Boolean(entry.ended_at),
    };

    function updateDuration() {
      const snapshot = snapshotRef.current;
      if (!snapshot) {
        setDurationSeconds(0);
        return;
      }

      const elapsedSinceSnapshot = snapshot.isStopped
        ? 0
        : Math.floor((Date.now() - snapshot.capturedAtMs) / 1000);

      setDurationSeconds(snapshot.baseDurationSeconds + elapsedSinceSnapshot);
    }

    updateDuration();

    if (entry.ended_at) {
      return;
    }

    const intervalId = window.setInterval(updateDuration, 1000);

    return () => window.clearInterval(intervalId);
  }, [entry?.duration_seconds, entry?.ended_at, entry?.id]);

  return durationSeconds;
}
