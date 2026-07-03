import { useState } from "react";

import type { TimeEntry } from "../api";
import { updateTimeEntry } from "../api";
import { formatDateTime } from "../utils/formatters";

interface EntryAdjustmentRowProps {
  entry: TimeEntry;
  onSaved: () => Promise<void>;
}

export function EntryAdjustmentRow({ entry, onSaved }: EntryAdjustmentRowProps) {
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
