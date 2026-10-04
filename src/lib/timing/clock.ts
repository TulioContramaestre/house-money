const timeFormat = new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit", second: "2-digit" });
const dateTimeFormat = new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" });
const clockFormat = new Intl.DateTimeFormat(undefined, { timeStyle: "short" });

export function formatTime(ms: number): string {
  return timeFormat.format(ms);
}

export function formatDateTime(ms: number): string {
  return dateTimeFormat.format(ms);
}

export function formatClock(ms: number): string {
  return clockFormat.format(ms);
}
