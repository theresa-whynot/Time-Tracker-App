import type { Summary } from "../api";
import { downloadSummaryCsv } from "../utils/csv";
import { formatDuration } from "../utils/formatters";

interface SummaryCardProps {
  csvFilename: string;
  summary: Summary | null;
  title: string;
}

export function SummaryCard({ csvFilename, title, summary }: SummaryCardProps) {
  if (!summary) {
    return (
      <section className="card">
        <div className="section-heading">
          <h2>{title}</h2>
          <button className="secondary" disabled type="button">
            Download CSV
          </button>
        </div>
        <p className="muted">No summary loaded yet.</p>
      </section>
    );
  }

  return (
    <section className="card">
      <div className="section-heading">
        <h2>{title}</h2>
        <div className="summary-actions">
          <strong>{formatDuration(summary.total_seconds)}</strong>
          <button
            className="secondary"
            disabled={summary.buckets.length === 0}
            onClick={() => downloadSummaryCsv(summary, csvFilename)}
            type="button"
          >
            Download CSV
          </button>
        </div>
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
