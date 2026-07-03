export function dateInputValue(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function weekStartValue(date: Date): string {
  const copy = new Date(date);
  const day = copy.getDay();
  const distanceFromMonday = day === 0 ? 6 : day - 1;
  copy.setDate(copy.getDate() - distanceFromMonday);
  return dateInputValue(copy);
}
