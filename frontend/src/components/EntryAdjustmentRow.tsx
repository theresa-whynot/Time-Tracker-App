import { useEffect, useMemo, useState } from "react";

import type { TimeEntry } from "../api";
import { deleteTimeEntry, updateTimeEntry } from "../api";
import { DEFAULT_PROJECT_NAME } from "../config";
import { wholeMinutesFromSeconds } from "../utils/formatters";
import { loadSavedClients, saveClientName } from "../utils/savedClients";

interface EntryAdjustmentRowProps {
  entry: TimeEntry;
  onSaved: () => Promise<void>;
}

function toDateTimeLocalValue(value: string | null): string {
  if (!value) {
    return "";
  }

  return value.slice(0, 16);
}

function toIsoDateTime(value: string): string {
  return value.length === 16 ? `${value}:00+00:00` : value;
}

function durationSecondsBetween(startedAt: string, endedAt: string): number {
  const startedAtMs = new Date(toIsoDateTime(startedAt)).getTime();
  const endedAtMs = new Date(toIsoDateTime(endedAt)).getTime();
  if (!Number.isFinite(startedAtMs) || !Number.isFinite(endedAtMs)) {
    return 0;
  }

  return Math.max(0, Math.round((endedAtMs - startedAtMs) / 1000));
}

export function EntryAdjustmentRow({ entry, onSaved }: EntryAdjustmentRowProps) {
  const [clientName, setClientName] = useState(entry.client_name);
  const [description, setDescription] = useState(entry.description);
  const [endedAt, setEndedAt] = useState(toDateTimeLocalValue(entry.ended_at));
  const [loggedMinutes, setLoggedMinutes] = useState(
    wholeMinutesFromSeconds(entry.duration_seconds).toString(),
  );
  const [notes, setNotes] = useState(entry.notes);
  const [deleting, setDeleting] = useState(false);
  const [savedClients, setSavedClients] = useState<string[]>(() => loadSavedClients());
  const [saving, setSaving] = useState(false);
  const [startedAt, setStartedAt] = useState(toDateTimeLocalValue(entry.started_at));
  const [taskName, setTaskName] = useState(entry.task_name);

  const baseDurationSeconds = useMemo(
    () => durationSecondsBetween(startedAt, endedAt),
    [endedAt, startedAt],
  );

  useEffect(() => {
    setClientName(entry.client_name);
    setDescription(entry.description);
    setEndedAt(toDateTimeLocalValue(entry.ended_at));
    setLoggedMinutes(wholeMinutesFromSeconds(entry.duration_seconds).toString());
    setNotes(entry.notes);
    setStartedAt(toDateTimeLocalValue(entry.started_at));
    setTaskName(entry.task_name);
  }, [
    entry.client_name,
    entry.description,
    entry.duration_seconds,
    entry.ended_at,
    entry.notes,
    entry.started_at,
    entry.task_name,
  ]);

  function updateStartedAt(value: string) {
    setStartedAt(value);
    if (endedAt && value) {
      setLoggedMinutes(wholeMinutesFromSeconds(durationSecondsBetween(value, endedAt)).toString());
    }
  }

  function updateEndedAt(value: string) {
    setEndedAt(value);
    if (startedAt && value) {
      setLoggedMinutes(wholeMinutesFromSeconds(durationSecondsBetween(startedAt, value)).toString());
    }
  }

  async function handleSave() {
    if (!clientName.trim() || !taskName.trim() || !startedAt || !endedAt) {
      window.alert("Client, task, start, and end are required.");
      return;
    }

    if (new Date(toIsoDateTime(endedAt)) < new Date(toIsoDateTime(startedAt))) {
      window.alert("End time must be after start time.");
      return;
    }

    const requestedMinutes = Number(loggedMinutes || "0");
    const requestedTotalSeconds = Number.isFinite(requestedMinutes)
      ? Math.max(0, Math.round(requestedMinutes * 60))
      : baseDurationSeconds;

    setSaving(true);
    try {
      setSavedClients((clients) => saveClientName(clientName, clients));
      await updateTimeEntry(entry.id, {
        client_name: clientName,
        description,
        ended_at: toIsoDateTime(endedAt),
        project_name: entry.project_name || DEFAULT_PROJECT_NAME,
        seconds_adjustment: requestedTotalSeconds - baseDurationSeconds,
        started_at: toIsoDateTime(startedAt),
        task_name: taskName,
        notes,
      });
      await onSaved();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    const confirmed = window.confirm("Delete this time block?");
    if (!confirmed) {
      return;
    }

    setDeleting(true);
    try {
      await deleteTimeEntry(entry.id);
      await onSaved();
      await window.timeTracker?.notifyTimerChanged();
    } finally {
      setDeleting(false);
    }
  }

  return (
    <article className="entry-row">
      <label>
        Client
        <input
          list={`saved-clients-${entry.id}`}
          required
          value={clientName}
          onChange={(event) => setClientName(event.target.value)}
          placeholder="Client name"
        />
        <datalist id={`saved-clients-${entry.id}`}>
          {savedClients.map((client) => (
            <option key={client} value={client} />
          ))}
        </datalist>
      </label>
      <label>
        Task
        <input
          required
          value={taskName}
          onChange={(event) => setTaskName(event.target.value)}
          placeholder="Task name"
        />
      </label>
      <label>
        Start
        <input
          required
          type="datetime-local"
          value={startedAt}
          onChange={(event) => updateStartedAt(event.target.value)}
        />
      </label>
      <label>
        End
        <input
          required
          type="datetime-local"
          value={endedAt}
          onChange={(event) => updateEndedAt(event.target.value)}
        />
      </label>
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
        Description
        <input
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Optional description"
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
      <button className="danger" disabled={deleting} onClick={handleDelete} type="button">
        {deleting ? "Deleting..." : "Delete block"}
      </button>
    </article>
  );
}
