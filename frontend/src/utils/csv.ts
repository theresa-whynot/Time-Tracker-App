import type { Summary } from "../api";

function csvCell(value: string | number): string {
  const text = String(value);
  if (/[",\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

export function summaryToCsv(summary: Summary): string {
  const headers = [
    "period_start",
    "period_end",
    "client",
    "project",
    "task",
    "duration_minutes",
    "duration_hours",
  ];

  const rows = summary.buckets.map((bucket) => [
    summary.start,
    summary.end,
    bucket.client_name,
    bucket.project_name,
    bucket.task_name,
    (bucket.duration_seconds / 60).toFixed(2),
    (bucket.duration_seconds / 3600).toFixed(2),
  ]);

  return [headers, ...rows].map((row) => row.map(csvCell).join(",")).join("\n");
}

export function downloadSummaryCsv(summary: Summary, filename: string): void {
  const blob = new Blob([summaryToCsv(summary)], {
    type: "text/csv;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
