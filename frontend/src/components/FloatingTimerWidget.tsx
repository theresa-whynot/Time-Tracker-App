import { useCallback, useEffect, useState } from "react";

import { getActiveTimer, stopTimer } from "../api";
import type { TimeEntry } from "../api";
import { useLiveTimeEntryDuration } from "../hooks/useLiveTimeEntryDuration";
import { formatLiveDuration } from "../utils/formatters";

export function FloatingTimerWidget() {
  const [active, setActive] = useState<TimeEntry | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stopping, setStopping] = useState(false);
  const durationSeconds = useLiveTimeEntryDuration(active);

  const refresh = useCallback(async () => {
    try {
      const activeTimer = await getActiveTimer();
      setActive(activeTimer);
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
    return window.timeTracker?.onTimerChanged(() => {
      refresh();
    });
  }, [refresh]);

  async function handleOpenPrompt() {
    await window.timeTracker?.openPrompt();
  }

  async function handleToggleCollapsed() {
    const nextCollapsed = !collapsed;
    setCollapsed(nextCollapsed);
    await window.timeTracker?.setWidgetCollapsed(nextCollapsed);
  }

  async function handleStop() {
    setStopping(true);
    try {
      await stopTimer();
      setActive(null);
      await window.timeTracker?.notifyTimerChanged();
      await refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to stop timer.");
    } finally {
      setStopping(false);
    }
  }

  return (
    <section className={collapsed ? "floating-widget floating-widget-collapsed" : "floating-widget"}>
      <div className="widget-header">
        <div className="widget-title">
          <span className="widget-status-dot" aria-hidden="true" />
          <span>{collapsed ? formatLiveDuration(durationSeconds) : "ClearHours"}</span>
        </div>
        <button
          className="widget-chrome-button"
          onClick={handleToggleCollapsed}
          type="button"
          aria-label={collapsed ? "Expand timer widget" : "Minimize timer widget"}
        >
          {collapsed ? "+" : "-"}
        </button>
      </div>

      {!collapsed && (
        <>
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
            <span>Simple tracking, ready when you are.</span>
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
        </>
      )}

      {collapsed && (
        <button className="widget-collapsed-open" onClick={handleOpenPrompt} type="button">
          {active ? active.task_name : "Start"}
        </button>
      )}
    </section>
  );
}
