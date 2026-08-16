interface HeroProps {
  promptIntervalMinutes: number;
}

export function Hero({ promptIntervalMinutes }: HeroProps) {
  return (
    <header className="hero">
      <div className="hero-brand">
        <div className="hero-icon" aria-hidden="true">
          <span />
        </div>
        <p className="eyebrow">ClearHours</p>
      </div>

      <div className="hero-copy">
        <h1>Clean time tracking. Nothing creepy. Nothing extra.</h1>
        <p>
          Track client and task time without screenshots, surveillance, or bloated dashboards.
          ClearHours keeps the timer close, nudges you every {promptIntervalMinutes} minutes,
          and turns your workday into simple summaries.
        </p>
      </div>

      <div className="hero-highlights" aria-label="Product highlights">
        <span>No screen monitoring</span>
        <span>No bloat</span>
        <span>Clean CSV summaries</span>
      </div>
    </header>
  );
}
