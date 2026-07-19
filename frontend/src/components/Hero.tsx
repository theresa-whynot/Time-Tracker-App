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
        <p className="eyebrow">Client & task timekeeping</p>
      </div>

      <div className="hero-copy">
        <h1>Stay focused. Capture every billable minute.</h1>
        <p>
          A quiet desktop timer that keeps client work organized, nudges you every{" "}
          {promptIntervalMinutes} minutes, and turns your day into clean summaries.
        </p>
      </div>

      <div className="hero-highlights" aria-label="Product highlights">
        <span>Live timer</span>
        <span>Client history</span>
        <span>CSV summaries</span>
      </div>
    </header>
  );
}
