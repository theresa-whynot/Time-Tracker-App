interface SummaryControlsProps {
  day: string;
  onDayChange: (day: string) => void;
  onWeekStartChange: (weekStart: string) => void;
  weekStart: string;
}

export function SummaryControls({
  day,
  onDayChange,
  onWeekStartChange,
  weekStart,
}: SummaryControlsProps) {
  return (
    <div className="controls-grid">
      <label>
        Day summary
        <input type="date" value={day} onChange={(event) => onDayChange(event.target.value)} />
      </label>
      <label>
        Week starts
        <input
          type="date"
          value={weekStart}
          onChange={(event) => onWeekStartChange(event.target.value)}
        />
      </label>
    </div>
  );
}
