interface HeroProps {
  onOpenPrompt: () => void;
  promptIntervalMinutes: number;
}

export function Hero({ onOpenPrompt, promptIntervalMinutes }: HeroProps) {
  return (
    <header className="hero">
      <div>
        <p className="eyebrow">Desktop time tracking starter</p>
        <h1>Track time by client, project, and task.</h1>
        <p>
          The app prompts on launch and every {promptIntervalMinutes} minutes so work
          blocks stay fresh without forcing a response.
        </p>
      </div>
      <button onClick={onOpenPrompt} type="button">
        What am I working on?
      </button>
    </header>
  );
}
