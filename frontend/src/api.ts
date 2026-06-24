const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8000";

export interface WorkPrompt {
  client_name: string;
  project_name: string;
  task_name: string;
  description: string;
}

export interface TimeEntry {
  id: number;
  client_id: number;
  client_name: string;
  project_id: number;
  project_name: string;
  task_id: number;
  task_name: string;
  description: string;
  notes: string;
  started_at: string;
  ended_at: string | null;
  seconds_adjustment: number;
  duration_seconds: number;
}

export interface SummaryBucket {
  client_id: number;
  client_name: string;
  project_id: number;
  project_name: string;
  task_id: number;
  task_name: string;
  duration_seconds: number;
  entry_ids: number[];
}

export interface Summary {
  start: string;
  end: string;
  total_seconds: number;
  buckets: SummaryBucket[];
  entries: TimeEntry[];
}

export interface EntryUpdate {
  description?: string;
  notes?: string;
  started_at?: string;
  ended_at?: string | null;
  seconds_adjustment?: number;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(details || `Request failed with status ${response.status}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export function getActiveTimer(): Promise<TimeEntry | null> {
  return request<TimeEntry | null>("/timer/active");
}

export function startTimer(prompt: WorkPrompt): Promise<TimeEntry> {
  return request<TimeEntry>("/timer/start", {
    method: "POST",
    body: JSON.stringify(prompt),
  });
}

export function stopTimer(): Promise<TimeEntry | null> {
  return request<TimeEntry | null>("/timer/stop", {
    method: "POST",
  });
}

export function getDaySummary(day: string): Promise<Summary> {
  return request<Summary>(`/summaries/day?day=${day}`);
}

export function getWeekSummary(startDay: string): Promise<Summary> {
  return request<Summary>(`/summaries/week?start_day=${startDay}`);
}

export function updateTimeEntry(entryId: number, update: EntryUpdate): Promise<TimeEntry> {
  return request<TimeEntry>(`/time-entries/${entryId}`, {
    method: "PATCH",
    body: JSON.stringify(update),
  });
}
