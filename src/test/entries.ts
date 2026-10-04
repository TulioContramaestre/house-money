import type { LedgerEntry } from "@/lib/ledger/types";

export function entry(fields: Partial<LedgerEntry> & Pick<LedgerEntry, "seq">): LedgerEntry {
  return Object.freeze({
    at: 1_700_000_000_000 + fields.seq * 60_000,
    type: "bet" as const,
    game: "Blackjack",
    wager: 5000,
    net: 0,
    balance: 0,
    detail: "",
    ...fields,
  });
}

export const SAMPLE_BUY_IN = 100_000;
export const SAMPLE_FINAL = 99_500;

export const SAMPLE_SESSION: readonly LedgerEntry[] = [
  entry({ seq: 1, type: "buyin", game: "Cashier", wager: 0, net: 100_000, balance: 100_000, detail: "Chips purchased." }),
  entry({ seq: 2, game: "Blackjack", wager: 5000, net: 7500, balance: 107_500, detail: "You: blackjack. Dealer: 19. Win." }),
  entry({ seq: 3, game: "Roulette", wager: 10_000, net: -10_000, balance: 97_500, detail: "Landed 0 green. Lost: red." }),
  entry({ seq: 4, game: "Blackjack", wager: 5000, net: 0, balance: 97_500, detail: "You: 18. Dealer: 18. Push." }),
  entry({
    seq: 5,
    game: "Craps",
    wager: 2000,
    net: 2000,
    balance: 99_500,
    detail: "Rolled 7 (3 and 4). A natural. Pass wins. Pass line +2,000.",
  }),
];
