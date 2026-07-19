import { FormEvent, useEffect, useState } from "react";

import type { TimeEntry, WorkPrompt } from "../api";
import { DEFAULT_PROJECT_NAME } from "../config";

type PromptForm = Omit<WorkPrompt, "project_name">;
const savedClientsKey = "timeTracker.savedClients";

function loadSavedClients(): string[] {
  try {
    const value = window.localStorage.getItem(savedClientsKey);
    const parsed = value ? JSON.parse(value) : [];
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter((client): client is string => typeof client === "string");
  } catch {
    return [];
  }
}

function saveClientName(clientName: string, existingClients: string[]): string[] {
  const cleaned = clientName.trim();
  if (!cleaned) {
    return existingClients;
  }

  const withoutDuplicate = existingClients.filter(
    (client) => client.toLowerCase() !== cleaned.toLowerCase(),
  );
  const nextClients = [cleaned, ...withoutDuplicate].sort((a, b) => a.localeCompare(b));
  window.localStorage.setItem(savedClientsKey, JSON.stringify(nextClients));
  return nextClients;
}

function emptyPrompt(): PromptForm {
  return {
    client_name: "",
    task_name: "",
    description: "",
  };
}

interface PromptModalProps {
  active: TimeEntry | null;
  onDismiss: () => void;
  onStop: () => Promise<void>;
  onSubmit: (prompt: WorkPrompt) => Promise<void>;
}

export function PromptModal({ active, onDismiss, onSubmit, onStop }: PromptModalProps) {
  const [savedClients, setSavedClients] = useState<string[]>(() => loadSavedClients());
  const [prompt, setPrompt] = useState<PromptForm>(() => ({
    ...emptyPrompt(),
    client_name: active?.client_name ?? "",
    task_name: active?.task_name ?? "",
    description: active?.description ?? "",
  }));
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (active?.client_name) {
      setSavedClients((clients) => saveClientName(active.client_name, clients));
    }
  }, [active?.client_name]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    try {
      setSavedClients((clients) => saveClientName(prompt.client_name, clients));
      await onSubmit({
        ...prompt,
        project_name: DEFAULT_PROJECT_NAME,
      });
    } finally {
      setSubmitting(false);
    }
  }

  function updateField(field: keyof PromptForm, value: string) {
    setPrompt((current) => ({ ...current, [field]: value }));
  }

  return (
    <div className="modal-backdrop" role="presentation">
      <form className="prompt-modal" onSubmit={handleSubmit}>
        <div className="section-heading">
          <div>
            <p className="eyebrow">Time check</p>
            <h2>What are you working on?</h2>
          </div>
          <button className="icon-button" onClick={onDismiss} type="button" aria-label="Dismiss">
            x
          </button>
        </div>

        {active && (
          <p className="active-note">
            Current timer: <strong>{active.task_name}</strong> for {active.client_name}
          </p>
        )}

        <label>
          Client
          <input
            autoFocus
            list="saved-clients"
            required
            value={prompt.client_name}
            onChange={(event) => updateField("client_name", event.target.value)}
            placeholder="Acme Co."
          />
          <datalist id="saved-clients">
            {savedClients.map((client) => (
              <option key={client} value={client} />
            ))}
          </datalist>
        </label>
        <label>
          Task
          <input
            required
            value={prompt.task_name}
            onChange={(event) => updateField("task_name", event.target.value)}
            placeholder="Design review"
          />
        </label>
        <label>
          Notes
          <textarea
            value={prompt.description}
            onChange={(event) => updateField("description", event.target.value)}
            placeholder="Optional detail about this work block"
          />
        </label>

        <div className="prompt-actions">
          <button disabled={submitting} type="submit">
            {submitting ? "Starting..." : active ? "Update timer" : "Start timer"}
          </button>
          <button className="secondary" onClick={onDismiss} type="button">
            Remind me later
          </button>
          {active && (
            <button className="danger" onClick={onStop} type="button">
              Stop current timer
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
