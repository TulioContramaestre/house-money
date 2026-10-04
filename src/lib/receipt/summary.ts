import type { LedgerEntry, VerifyResult } from "@/lib/ledger/types";

export interface ReceiptHighlight {
  readonly net: number;
  readonly game: string;
}

export interface ReceiptGameLine {
  readonly game: string;
  readonly rounds: number;
  readonly net: number;
}

export interface ReceiptData {
  readonly startedAt: number;
  readonly endedAt: number;
  readonly buyIn: number;
  readonly final: number;
  readonly net: number;
  readonly rounds: number;
  readonly won: number;
  readonly lost: number;
  readonly pushed: number;
  readonly wagered: number;
  readonly best: ReceiptHighlight | null;
  readonly worst: ReceiptHighlight | null;
  readonly byGame: readonly ReceiptGameLine[];
  readonly entries: readonly LedgerEntry[];
  readonly check: VerifyResult;
  readonly checkText: string;
}

export interface ReceiptInput {
  readonly entries: readonly LedgerEntry[];
  readonly buyIn: number;
  readonly final: number;
  readonly startedAt: number;
  readonly endedAt: number;
  readonly check: VerifyResult;
}

export function checkText(check: VerifyResult): string {
  if (!check.ok) return "Ledger check failed: the log was changed after it was written. Treat these numbers as unreliable.";
  const how = check.sealed ? ", every balance and seal matches" : " and every balance matches";
  return `Ledger check passed: ${check.count} entries replayed${how}.`;
}

export function buildReceipt(input: ReceiptInput): ReceiptData {
  const bets = input.entries.filter((e) => e.type === "bet");
  let won = 0;
  let lost = 0;
  let wagered = 0;
  let best: LedgerEntry | null = null;
  let worst: LedgerEntry | null = null;
  const byGame = new Map<string, { rounds: number; net: number }>();
  for (const e of bets) {
    if (e.net > 0) won++;
    if (e.net < 0) lost++;
    wagered += e.wager;
    if (e.net > 0 && (!best || e.net > best.net)) best = e;
    if (e.net < 0 && (!worst || e.net < worst.net)) worst = e;
    const line = byGame.get(e.game) ?? { rounds: 0, net: 0 };
    byGame.set(e.game, { rounds: line.rounds + 1, net: line.net + e.net });
  }
  return {
    startedAt: input.startedAt,
    endedAt: input.endedAt,
    buyIn: input.buyIn,
    final: input.final,
    net: input.final - input.buyIn,
    rounds: bets.length,
    won,
    lost,
    pushed: bets.length - won - lost,
    wagered,
    best: best && { net: best.net, game: best.game },
    worst: worst && { net: worst.net, game: worst.game },
    byGame: [...byGame].map(([game, line]) => ({ game, ...line })),
    entries: input.entries,
    check: input.check,
    checkText: checkText(input.check),
  };
}
