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
            Adjust entries after reviewing the daily or weekly summary. Positive or
            negative minutes are added to the original tracked duration.
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
