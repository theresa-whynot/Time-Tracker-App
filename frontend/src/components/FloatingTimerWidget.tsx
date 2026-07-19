import { useCallback, useEffect, useState } from "react";

import { getActiveTimer, stopTimer } from "../api";
import type { TimeEntry } from "../api";
import { formatLiveDuration } from "../utils/formatters";
import { currentTimeEntryDurationSeconds } from "../utils/timeEntries";

export function FloatingTimerWidget() {
  const [active, setActive] = useState<TimeEntry | null>(null);
  const [durationSeconds, setDurationSeconds] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [stopping, setStopping] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const activeTimer = await getActiveTimer();
      setActive(activeTimer);
      setDurationSeconds(activeTimer ? currentTimeEntryDurationSeconds(activeTimer) : 0);
      setError(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to load timer.");
    }
  }, []);

  useEffect(() => {
    refresh();
    const intervalId = window.setInterval(refresh, 5000);

    return () => window.clearInterval(intervalId);
  }, [refresh]);

  useEffect(() => {
    if (!active) {
      setDurationSeconds(0);
      return;
    }

    setDurationSeconds(currentTimeEntryDurationSeconds(active));
    if (active.ended_at) {
      return;
    }

    const intervalId = window.setInterval(() => {
      setDurationSeconds(currentTimeEntryDurationSeconds(active));
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [active]);

  async function handleOpenPrompt() {
    await window.timeTracker?.openPrompt();
  }

  async function handleStop() {
    setStopping(true);
    try {
      await stopTimer();
      await refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to stop timer.");
    } finally {
      setStopping(false);
    }
  }

  return (
    <section className="floating-widget">
      <div className="widget-header">
        <span className="widget-status-dot" aria-hidden="true" />
        <span>Time Tracker</span>
      </div>

      {active ? (
        <>
          <div className="widget-task">
            <strong>{active.task_name}</strong>
            <span>{active.client_name}</span>
          </div>
          <div className="widget-duration">{formatLiveDuration(durationSeconds)}</div>
        </>
      ) : (
        <>
          <div className="widget-task">
            <strong>No timer running</strong>
            <span>Start a timer to keep this widget live.</span>
          </div>
          <div className="widget-duration">0:00</div>
        </>
      )}

      {error && <p className="widget-error">{error}</p>}

      <div className="widget-actions">
        <button className="secondary compact-button" onClick={handleOpenPrompt} type="button">
          {active ? "Update" : "Start"}
        </button>
        {active && (
          <button
            className="compact-button"
            disabled={stopping}
            onClick={handleStop}
            type="button"
          >
            {stopping ? "Stopping" : "Stop"}
          </button>
        )}
      </div>
    </section>
  );
}
