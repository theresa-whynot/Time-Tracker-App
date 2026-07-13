import { FormEvent, useState } from "react";

import type { TimeEntry, WorkPrompt } from "../api";
import { DEFAULT_PROJECT_NAME } from "../config";

type PromptForm = Omit<WorkPrompt, "project_name">;

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
  const [prompt, setPrompt] = useState<PromptForm>(() => ({
    ...emptyPrompt(),
    client_name: active?.client_name ?? "",
    task_name: active?.task_name ?? "",
    description: active?.description ?? "",
  }));
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    try {
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
            required
            value={prompt.client_name}
            onChange={(event) => updateField("client_name", event.target.value)}
            placeholder="Acme Co."
          />
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
