import type { TimeEntry } from "../api";
import { formatDuration } from "../utils/formatters";

interface ActiveTimerCardProps {
  active: TimeEntry | null;
  onOpenPrompt: () => void;
  onStop: () => Promise<void>;
}

export function ActiveTimerCard({ active, onOpenPrompt, onStop }: ActiveTimerCardProps) {
  return (
    <section className="card active-card">
      <div>
        <p className="eyebrow">Current timer</p>
        {active ? (
          <>
            <h2>{active.task_name}</h2>
            <p>
              {active.client_name} / {active.project_name}
            </p>
            <strong>{formatDuration(active.duration_seconds)}</strong>
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
