import { useCallback, useEffect, useMemo, useState } from "react";

import {
  getActiveTimer,
  getDaySummary,
  getWeekSummary,
  startTimer,
  stopTimer,
} from "../api";
import type { Summary, TimeEntry, WorkPrompt } from "../api";
import { PROMPT_INTERVAL_MINUTES } from "../config";
import { dateInputValue, weekStartValue } from "../utils/dates";

export function useTimeTrackerDashboard() {
  const [active, setActive] = useState<TimeEntry | null>(null);
  const [daySummary, setDaySummary] = useState<Summary | null>(null);
  const [weekSummary, setWeekSummary] = useState<Summary | null>(null);
  const [day, setDay] = useState(dateInputValue(new Date()));
  const [weekStart, setWeekStart] = useState(weekStartValue(new Date()));
  const [promptOpen, setPromptOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const promptIntervalMs = useMemo(
    () => Math.max(1, PROMPT_INTERVAL_MINUTES) * 60 * 1000,
    [],
  );

  const refresh = useCallback(async () => {
    const [activeTimer, currentDay, currentWeek] = await Promise.all([
      getActiveTimer(),
      getDaySummary(day),
      getWeekSummary(weekStart),
    ]);
    setActive(activeTimer);
    setDaySummary(currentDay);
    setWeekSummary(currentWeek);
  }, [day, weekStart]);

  const openPrompt = useCallback(async () => {
    setPromptOpen(true);
    await window.timeTracker?.requestPromptAttention();
  }, []);

  const dismissPrompt = useCallback(async () => {
    setPromptOpen(false);
    await window.timeTracker?.releasePromptAttention();
  }, []);

  useEffect(() => {
    refresh().catch((caught: Error) => setError(caught.message));
  }, [refresh]);

  useEffect(() => {
    openPrompt().catch((caught: Error) => setError(caught.message));
    const intervalId = window.setInterval(() => {
      openPrompt().catch((caught: Error) => setError(caught.message));
    }, promptIntervalMs);

    return () => window.clearInterval(intervalId);
  }, [openPrompt, promptIntervalMs]);

  const handlePromptSubmit = useCallback(
    async (prompt: WorkPrompt) => {
      setError(null);
      try {
        await startTimer(prompt);
        await dismissPrompt();
        await refresh();
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Unable to start timer.");
      }
    },
    [dismissPrompt, refresh],
  );

  const handleStop = useCallback(async () => {
    setError(null);
    try {
      await stopTimer();
      await dismissPrompt();
      await refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to stop timer.");
    }
  }, [dismissPrompt, refresh]);

  return {
    active,
    day,
    daySummary,
    dismissPrompt,
    error,
    handlePromptSubmit,
    handleStop,
    openPrompt,
    promptIntervalMinutes: PROMPT_INTERVAL_MINUTES,
    promptOpen,
    refresh,
    setDay,
    setWeekStart,
    weekStart,
    weekSummary,
  };
}
