import { useEffect, useMemo, useState } from "react";

import type { TimeEntry } from "../api";
import { updateTimeEntry } from "../api";
import { DEFAULT_PROJECT_NAME } from "../config";
import { formatDateTime } from "../utils/formatters";

interface EntryAdjustmentRowProps {
  entry: TimeEntry;
  onSaved: () => Promise<void>;
}

export function EntryAdjustmentRow({ entry, onSaved }: EntryAdjustmentRowProps) {
  const baseDurationSeconds = useMemo(
    () => Math.max(0, entry.duration_seconds - entry.seconds_adjustment),
    [entry.duration_seconds, entry.seconds_adjustment],
  );
  const [loggedMinutes, setLoggedMinutes] = useState(
    Math.round(entry.duration_seconds / 60).toString(),
  );
  const [notes, setNotes] = useState(entry.notes);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setLoggedMinutes(Math.round(entry.duration_seconds / 60).toString());
    setNotes(entry.notes);
  }, [entry.duration_seconds, entry.notes]);

  async function handleSave() {
    const requestedMinutes = Number(loggedMinutes || "0");
    const requestedTotalSeconds = Number.isFinite(requestedMinutes)
      ? Math.max(0, Math.round(requestedMinutes * 60))
      : baseDurationSeconds;

    setSaving(true);
    try {
      await updateTimeEntry(entry.id, {
        seconds_adjustment: requestedTotalSeconds - baseDurationSeconds,
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
          {entry.project_name === DEFAULT_PROJECT_NAME
            ? entry.client_name
            : `${entry.client_name} / ${entry.project_name}`}
        </span>
        <small>
          {formatDateTime(entry.started_at)} - {formatDateTime(entry.ended_at)}
        </small>
      </div>
      <label>
        Logged minutes
        <input
          type="number"
          min="0"
          value={loggedMinutes}
          onChange={(event) => setLoggedMinutes(event.target.value)}
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
