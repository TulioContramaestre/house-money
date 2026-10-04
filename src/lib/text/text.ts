export function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function listJoin(items: readonly string[]): string {
  if (items.length < 2) return items.join("");
  const last = items[items.length - 1] ?? "";
  return `${items.slice(0, -1).join(", ")} or ${last}`;
}
