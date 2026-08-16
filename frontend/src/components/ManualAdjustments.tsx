import type { Summary } from "../api";
import { EntryAdjustmentRow } from "./EntryAdjustmentRow";
import { ManualTimeEntryForm } from "./ManualTimeEntryForm";

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
            Review existing entries, add missed time blocks, or delete entries that should
            not count.
          </p>
        </div>
      </div>
      <ManualTimeEntryForm periodStart={daySummary?.start} onSaved={onEntrySaved} />
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
