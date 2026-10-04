import { fmt } from "./format";

export const MIN_BUY_IN = 1000;
export const MAX_BUY_IN = 1_000_000_000;

export function parseAmount(raw: string): number {
  const cleaned = raw.trim().toLowerCase().replace(/[\s,_$]/g, "");
  const match = /^(\d+(?:\.\d+)?)([km]?)$/.exec(cleaned);
  if (!match) return NaN;
  const [, digits = "", suffix = ""] = match;
  const unit = suffix === "k" ? 1e3 : suffix === "m" ? 1e6 : 1;
  return Math.round(parseFloat(digits) * unit);
}

export function checkAmount(v: number): string {
  if (!Number.isFinite(v)) return "Enter an amount in whole thousands, like 400,000.";
  if (v < MIN_BUY_IN) return "The smallest buy-in is 1,000.";
  if (v > MAX_BUY_IN) return "The largest buy-in is 1,000,000,000.";
  if (v % 1000) {
    return `Use whole thousands: ${fmt(Math.floor(v / 1000) * 1000)} or ${fmt(Math.ceil(v / 1000) * 1000)} would work.`;
  }
  return "";
}
