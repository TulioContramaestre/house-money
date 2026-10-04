import type { Ledger } from "@/lib/ledger/ledger";
import type { LedgerPort } from "./types";

export function createLedgerPort(ledger: Ledger, subscribe: (listener: () => void) => () => void): LedgerPort {
  return {
    get available() {
      return ledger.available;
    },
    reserve: (amount) => ledger.reserve(amount),
    release: (amount) => ledger.release(amount),
    settle: (game, wager, net, detail) => {
      ledger.settle(game, wager, net, detail);
    },
    subscribe,
  };
}
