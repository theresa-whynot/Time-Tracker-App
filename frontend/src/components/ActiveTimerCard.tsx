import { useEffect, useState } from "react";

import type { TimeEntry } from "../api";
import { formatLiveDuration } from "../utils/formatters";

interface ActiveTimerCardProps {
  active: TimeEntry | null;
  onOpenPrompt: () => void;
  onStop: () => Promise<void>;
}

function currentDurationSeconds(entry: TimeEntry): number {
  const startedAt = Date.parse(entry.started_at);
  const endedAt = entry.ended_at ? Date.parse(entry.ended_at) : Date.now();
  const elapsedSeconds = Math.max(0, Math.floor((endedAt - startedAt) / 1000));
  return Math.max(0, elapsedSeconds + entry.seconds_adjustment);
}

export function ActiveTimerCard({ active, onOpenPrompt, onStop }: ActiveTimerCardProps) {
  const [liveDurationSeconds, setLiveDurationSeconds] = useState(
    active ? currentDurationSeconds(active) : 0,
  );

  useEffect(() => {
    if (!active) {
      setLiveDurationSeconds(0);
      return;
    }

    setLiveDurationSeconds(currentDurationSeconds(active));
    if (active.ended_at) {
      return;
    }

    const intervalId = window.setInterval(() => {
      setLiveDurationSeconds(currentDurationSeconds(active));
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [active]);

  return (
    <section className="card active-card">
      <div>
        <p className="eyebrow">Current timer</p>
        {active ? (
          <>
            <h2>{active.task_name}</h2>
            <p>{active.client_name}</p>
            <strong>{formatLiveDuration(liveDurationSeconds)}</strong>
          </>
        ) : (
          <>
            <h2>No timer running</h2>
            <p className="muted">Start a timer from the prompt to begin tracking work.</p>
          </>
        )}
      </div>
      <div className="card-actions">
        <button onClick={onOpenPrompt} type="button">
          {active ? "Update work" : "Start timer"}
        </button>
        {active && (
          <button className="secondary" onClick={onStop} type="button">
            Stop timer
          </button>
        )}
      </div>
    </section>
  );
}
