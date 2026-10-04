import { createLedgerPort } from "@/games/ledgerPort";
import type { EngineDeps } from "@/games/types";
import { Ledger } from "@/lib/ledger/ledger";
import { seededRng, type Rng } from "@/lib/random/rng";

export interface HarnessOptions {
  readonly buyIn?: number;
  readonly chip?: number;
  readonly rng?: Rng;
  readonly reducedMotion?: boolean;
  readonly pause?: (ms: number) => Promise<void>;
}

export async function engineHarness<E>(create: (deps: EngineDeps) => E, options: HarnessOptions = {}) {
  const listeners = new Set<() => void>();
  const ledger = new Ledger(() => {
    for (const listener of [...listeners]) listener();
  });
  await ledger.open(options.buyIn ?? 100_000);
  let chip = options.chip ?? 5000;
  let reduced = options.reducedMotion ?? true;
  const pauses: number[] = [];
  const deps: EngineDeps = {
    ledger: createLedgerPort(ledger, (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    }),
    rng: options.rng ?? seededRng(1),
    pause: (ms) => {
      pauses.push(ms);
      return options.pause ? options.pause(ms) : Promise.resolve();
    },
    getChip: () => chip,
    reducedMotion: () => reduced,
  };
  const engine = create(deps);
  return {
    engine,
    ledger,
    pauses,
    setChip(value: number) {
      chip = value;
    },
    setReducedMotion(value: boolean) {
      reduced = value;
    },
    lastEntry: () => ledger.entries().at(-1),
  };
}

export function flush(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}
