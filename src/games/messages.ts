import { fmt } from "@/lib/money/format";

export function resultPhrase(net: number): string {
  if (net > 0) return `You win ${fmt(net)}.`;
  if (net < 0) return `You lose ${fmt(-net)}.`;
  return "You break even.";
}

export function noCash(amount: number): string {
  return `You don't have ${fmt(amount)} in cash.`;
}
