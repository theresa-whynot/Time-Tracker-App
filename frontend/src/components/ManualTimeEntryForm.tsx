import { FormEvent, useMemo, useState } from "react";

import { createManualTimeEntry } from "../api";
import { DEFAULT_PROJECT_NAME } from "../config";
import { loadSavedClients, saveClientName } from "../utils/savedClients";

interface ManualTimeEntryFormProps {
  periodStart?: string;
  onSaved: () => Promise<void>;
}

function datePart(value?: string): string {
  if (!value) {
    return new Date().toISOString().slice(0, 10);
  }

  return value.slice(0, 10);
}

function defaultDateTime(value: string | undefined, hour: number): string {
  return `${datePart(value)}T${hour.toString().padStart(2, "0")}:00`;
}

function toIsoDateTime(value: string): string {
  return value.length === 16 ? `${value}:00+00:00` : value;
}

export function ManualTimeEntryForm({ onSaved, periodStart }: ManualTimeEntryFormProps) {
  const initialStart = useMemo(() => defaultDateTime(periodStart, 9), [periodStart]);
  const initialEnd = useMemo(() => defaultDateTime(periodStart, 10), [periodStart]);
  const [clientName, setClientName] = useState("");
  const [description, setDescription] = useState("");
  const [endTime, setEndTime] = useState(initialEnd);
  const [error, setError] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [savedClients, setSavedClients] = useState<string[]>(() => loadSavedClients());
  const [saving, setSaving] = useState(false);
  const [startTime, setStartTime] = useState(initialStart);
  const [taskName, setTaskName] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    try {
      if (new Date(toIsoDateTime(endTime)) < new Date(toIsoDateTime(startTime))) {
        throw new Error("End time must be after start time.");
      }

      setSavedClients((clients) => saveClientName(clientName, clients));
      await createManualTimeEntry({
        client_name: clientName,
        description,
        ended_at: toIsoDateTime(endTime),
        notes,
        project_name: DEFAULT_PROJECT_NAME,
        started_at: toIsoDateTime(startTime),
        task_name: taskName,
      });

      setDescription("");
      setNotes("");
      setTaskName("");
      await onSaved();
      await window.timeTracker?.notifyTimerChanged();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to add time block.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="manual-entry-form" onSubmit={handleSubmit}>
      <div>
        <h3>Add a missing time block</h3>
        <p className="muted">Create a new client/task entry for time that was not captured.</p>
      </div>
      <div className="manual-entry-grid">
        <label>
          Client
          <input
            list="manual-saved-clients"
            required
            value={clientName}
            onChange={(event) => setClientName(event.target.value)}
            placeholder="Acme Co."
          />
          <datalist id="manual-saved-clients">
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
            placeholder="Design review"
          />
        </label>
        <label>
          Start
          <input
            required
            type="datetime-local"
            value={startTime}
            onChange={(event) => setStartTime(event.target.value)}
          />
        </label>
        <label>
          End
          <input
            required
            type="datetime-local"
            value={endTime}
            onChange={(event) => setEndTime(event.target.value)}
          />
        </label>
      </div>

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
          placeholder="Optional adjustment note"
        />
      </label>

      {error && <p className="field-error">{error}</p>}

      <button disabled={saving} type="submit">
        {saving ? "Adding..." : "Add time block"}
      </button>
    </form>
  );
}
