interface HeroProps {
  promptIntervalMinutes: number;
}

export function Hero({ promptIntervalMinutes }: HeroProps) {
  return (
    <header className="hero">
      <div>
        <p className="eyebrow">Desktop time tracking starter</p>
        <h1>Track Time by Client & Task</h1>
        <p>
          The app prompts on launch and every {promptIntervalMinutes} minutes so work
          blocks stay fresh without forcing a response.
        </p>
      </div>
    </header>
  );
}
