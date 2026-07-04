import { ActiveTimerCard } from "./components/ActiveTimerCard";
import { Hero } from "./components/Hero";
import { ManualAdjustments } from "./components/ManualAdjustments";
import { PromptModal } from "./components/PromptModal";
import { SummaryCard } from "./components/SummaryCard";
import { SummaryControls } from "./components/SummaryControls";
import { useTimeTrackerDashboard } from "./hooks/useTimeTrackerDashboard";

export default function App() {
  const dashboard = useTimeTrackerDashboard();

  return (
    <main className="app-shell">
      <Hero
        onOpenPrompt={dashboard.openPrompt}
        promptIntervalMinutes={dashboard.promptIntervalMinutes}
      />

      {dashboard.error && <div className="error-banner">{dashboard.error}</div>}

      <ActiveTimerCard
        active={dashboard.active}
        onOpenPrompt={dashboard.openPrompt}
        onStop={dashboard.handleStop}
      />

      <SummaryControls
        day={dashboard.day}
        onDayChange={dashboard.setDay}
        onWeekStartChange={dashboard.setWeekStart}
        weekStart={dashboard.weekStart}
      />

      <div className="summary-grid">
        <SummaryCard
          csvFilename={`time-summary-day-${dashboard.day}.csv`}
          title="End-of-day summary"
          summary={dashboard.daySummary}
        />
        <SummaryCard
          csvFilename={`time-summary-week-${dashboard.weekStart}.csv`}
          title="End-of-week summary"
          summary={dashboard.weekSummary}
        />
      </div>

      <ManualAdjustments daySummary={dashboard.daySummary} onEntrySaved={dashboard.refresh} />

      {dashboard.promptOpen && (
        <PromptModal
          active={dashboard.active}
          onDismiss={dashboard.dismissPrompt}
          onStop={dashboard.handleStop}
          onSubmit={dashboard.handlePromptSubmit}
        />
      )}
    </main>
  );
}
