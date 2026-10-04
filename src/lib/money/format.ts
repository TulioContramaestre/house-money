const numberFormat = new Intl.NumberFormat("en-US");

export function fmt(n: number): string {
  return numberFormat.format(n);
}

export function signed(n: number): string {
  if (n > 0) return `+${fmt(n)}`;
  if (n < 0) return `−${fmt(-n)}`;
  return "0";
}

export function short(n: number): string {
  if (n >= 1e6) return `${Number((n / 1e6).toFixed(2))}M`;
  if (n >= 1e3) return `${Number((n / 1e3).toFixed(1))}K`;
  return String(n);
}
