import { useEffect, useState } from "react";

import type { TimeEntry } from "../api";
import { formatLiveDuration } from "../utils/formatters";
import { currentTimeEntryDurationSeconds } from "../utils/timeEntries";

interface ActiveTimerCardProps {
  active: TimeEntry | null;
  onOpenPrompt: () => void;
  onStop: () => Promise<void>;
}

export function ActiveTimerCard({ active, onOpenPrompt, onStop }: ActiveTimerCardProps) {
  const [liveDurationSeconds, setLiveDurationSeconds] = useState(
    active ? currentTimeEntryDurationSeconds(active) : 0,
  );

  useEffect(() => {
    if (!active) {
      setLiveDurationSeconds(0);
      return;
    }

    setLiveDurationSeconds(currentTimeEntryDurationSeconds(active));
    if (active.ended_at) {
      return;
    }

    const intervalId = window.setInterval(() => {
      setLiveDurationSeconds(currentTimeEntryDurationSeconds(active));
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
