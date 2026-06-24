import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

import {
  Summary,
  TimeEntry,
  WorkPrompt,
  getActiveTimer,
  getDaySummary,
  getWeekSummary,
  startTimer,
  stopTimer,
  updateTimeEntry,
} from "./api";

const PROMPT_INTERVAL_MINUTES = Number(import.meta.env.VITE_PROMPT_INTERVAL_MINUTES ?? "30");

function dateInputValue(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function weekStartValue(date: Date): string {
  const copy = new Date(date);
  const day = copy.getDay();
  const distanceFromMonday = day === 0 ? 6 : day - 1;
  copy.setDate(copy.getDate() - distanceFromMonday);
  return dateInputValue(copy);
}

function formatDuration(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  if (hours === 0) {
    return `${minutes}m`;
  }
  return `${hours}h ${minutes.toString().padStart(2, "0")}m`;
}

function formatDateTime(value: string | null): string {
  if (!value) {
    return "Running";
  }
  return new Date(value).toLocaleString([], {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function emptyPrompt(): WorkPrompt {
  return {
    client_name: "",
    project_name: "",
    task_name: "",
    description: "",
  };
}

function SummaryCard({ title, summary }: { title: string; summary: Summary | null }) {
  if (!summary) {
    return (
      <section className="card">
        <h2>{title}</h2>
        <p className="muted">No summary loaded yet.</p>
      </section>
    );
  }

  return (
    <section className="card">
      <div className="section-heading">
        <h2>{title}</h2>
        <strong>{formatDuration(summary.total_seconds)}</strong>
      </div>
      {summary.buckets.length === 0 ? (
        <p className="muted">No tracked work in this period.</p>
      ) : (
        <div className="summary-list">
          {summary.buckets.map((bucket) => (
            <article className="summary-row" key={bucket.entry_ids.join("-")}>
              <div>
                <strong>{bucket.task_name}</strong>
                <span>
                  {bucket.client_name} / {bucket.project_name}
                </span>
              </div>
              <strong>{formatDuration(bucket.duration_seconds)}</strong>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function EntryAdjustmentRow({
  entry,
  onSaved,
}: {
  entry: TimeEntry;
  onSaved: () => Promise<void>;
}) {
  const [adjustmentMinutes, setAdjustmentMinutes] = useState(
    Math.round(entry.seconds_adjustment / 60).toString(),
  );
  const [notes, setNotes] = useState(entry.notes);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      await updateTimeEntry(entry.id, {
        seconds_adjustment: Math.round(Number(adjustmentMinutes || "0") * 60),
        notes,
      });
      await onSaved();
    } finally {
      setSaving(false);
    }
  }

  return (
    <article className="entry-row">
      <div>
        <strong>{entry.task_name}</strong>
        <span>
          {entry.client_name} / {entry.project_name}
        </span>
        <small>
          {formatDateTime(entry.started_at)} - {formatDateTime(entry.ended_at)}
        </small>
      </div>
      <label>
        Adjustment minutes
        <input
          type="number"
          value={adjustmentMinutes}
          onChange={(event) => setAdjustmentMinutes(event.target.value)}
        />
      </label>
      <label>
        Notes
        <input
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          placeholder="Optional correction note"
        />
      </label>
      <button className="secondary" disabled={saving} onClick={handleSave} type="button">
        {saving ? "Saving..." : "Save"}
      </button>
    </article>
  );
}

function PromptModal({
  active,
  onDismiss,
  onSubmit,
  onStop,
}: {
  active: TimeEntry | null;
  onDismiss: () => void;
  onSubmit: (prompt: WorkPrompt) => Promise<void>;
  onStop: () => Promise<void>;
}) {
  const [prompt, setPrompt] = useState<WorkPrompt>(() => ({
    ...emptyPrompt(),
    client_name: active?.client_name ?? "",
    project_name: active?.project_name ?? "",
    task_name: active?.task_name ?? "",
    description: active?.description ?? "",
  }));
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    try {
      await onSubmit(prompt);
    } finally {
      setSubmitting(false);
    }
  }

  function updateField(field: keyof WorkPrompt, value: string) {
    setPrompt((current) => ({ ...current, [field]: value }));
  }

  return (
    <div className="modal-backdrop" role="presentation">
      <form className="prompt-modal" onSubmit={handleSubmit}>
        <div className="section-heading">
          <div>
            <p className="eyebrow">Time check</p>
            <h2>What are you working on?</h2>
          </div>
          <button className="icon-button" onClick={onDismiss} type="button" aria-label="Dismiss">
            x
          </button>
        </div>

        {active && (
          <p className="active-note">
            Current timer: <strong>{active.task_name}</strong> for {active.client_name}
          </p>
        )}

        <label>
          Client
          <input
            autoFocus
            required
            value={prompt.client_name}
            onChange={(event) => updateField("client_name", event.target.value)}
            placeholder="Acme Co."
          />
        </label>
        <label>
          Project
          <input
            required
            value={prompt.project_name}
            onChange={(event) => updateField("project_name", event.target.value)}
            placeholder="Website redesign"
          />
        </label>
        <label>
          Task
          <input
            required
            value={prompt.task_name}
            onChange={(event) => updateField("task_name", event.target.value)}
            placeholder="Design review"
          />
        </label>
        <label>
          Notes
          <textarea
            value={prompt.description}
            onChange={(event) => updateField("description", event.target.value)}
            placeholder="Optional detail about this work block"
          />
        </label>

        <div className="prompt-actions">
          <button disabled={submitting} type="submit">
            {submitting ? "Starting..." : active ? "Update timer" : "Start timer"}
          </button>
          <button className="secondary" onClick={onDismiss} type="button">
            Remind me later
          </button>
          {active && (
            <button className="danger" onClick={onStop} type="button">
              Stop current timer
            </button>
          )}
        </div>
      </form>
    </div>
  );
}

export default function App() {
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

  async function handlePromptSubmit(prompt: WorkPrompt) {
    setError(null);
    try {
      await startTimer(prompt);
      await dismissPrompt();
      await refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to start timer.");
    }
  }

  async function handleStop() {
    setError(null);
    try {
      await stopTimer();
      await dismissPrompt();
      await refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to stop timer.");
    }
  }

  return (
    <main className="app-shell">
      <header className="hero">
        <div>
          <p className="eyebrow">Desktop time tracking starter</p>
          <h1>Track time by client, project, and task.</h1>
          <p>
            The app prompts on launch and every {PROMPT_INTERVAL_MINUTES} minutes so work
            blocks stay fresh without forcing a response.
          </p>
        </div>
        <button onClick={openPrompt} type="button">
          What am I working on?
        </button>
      </header>

      {error && <div className="error-banner">{error}</div>}

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
          <button onClick={openPrompt} type="button">
            {active ? "Update work" : "Start timer"}
          </button>
          {active && (
            <button className="secondary" onClick={handleStop} type="button">
              Stop timer
            </button>
          )}
        </div>
      </section>

      <div className="controls-grid">
        <label>
          Day summary
          <input type="date" value={day} onChange={(event) => setDay(event.target.value)} />
        </label>
        <label>
          Week starts
          <input
            type="date"
            value={weekStart}
            onChange={(event) => setWeekStart(event.target.value)}
          />
        </label>
      </div>

      <div className="summary-grid">
        <SummaryCard title="End-of-day summary" summary={daySummary} />
        <SummaryCard title="End-of-week summary" summary={weekSummary} />
      </div>

      <section className="card">
        <div className="section-heading">
          <div>
            <h2>Manual adjustments</h2>
            <p className="muted">
              Adjust entries after reviewing the daily or weekly summary. Positive or
              negative minutes are added to the original tracked duration.
            </p>
          </div>
        </div>
        {daySummary?.entries.length ? (
          <div className="entry-list">
            {daySummary.entries.map((entry) => (
              <EntryAdjustmentRow entry={entry} key={entry.id} onSaved={refresh} />
            ))}
          </div>
        ) : (
          <p className="muted">No entries for the selected day.</p>
        )}
      </section>

      {promptOpen && (
        <PromptModal
          active={active}
          onDismiss={dismissPrompt}
          onStop={handleStop}
          onSubmit={handlePromptSubmit}
        />
      )}
    </main>
  );
}
