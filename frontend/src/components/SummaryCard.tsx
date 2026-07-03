import type { Summary } from "../api";
import { formatDuration } from "../utils/formatters";

interface SummaryCardProps {
  summary: Summary | null;
  title: string;
}

export function SummaryCard({ title, summary }: SummaryCardProps) {
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
