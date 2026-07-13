import type { Summary } from "../api";
import { EntryAdjustmentRow } from "./EntryAdjustmentRow";

interface ManualAdjustmentsProps {
  daySummary: Summary | null;
  onEntrySaved: () => Promise<void>;
}

export function ManualAdjustments({ daySummary, onEntrySaved }: ManualAdjustmentsProps) {
  return (
    <section className="card">
      <div className="section-heading">
        <div>
          <h2>Manual adjustments</h2>
          <p className="muted">
            Review the minutes already logged for each entry and edit the total if it
            needs to be corrected.
          </p>
        </div>
      </div>
      {daySummary?.entries.length ? (
        <div className="entry-list">
          {daySummary.entries.map((entry) => (
            <EntryAdjustmentRow entry={entry} key={entry.id} onSaved={onEntrySaved} />
          ))}
        </div>
      ) : (
        <p className="muted">No entries for the selected day.</p>
      )}
    </section>
  );
}
