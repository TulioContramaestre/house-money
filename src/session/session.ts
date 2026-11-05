import { createLedgerPort } from "@/games/ledgerPort";
import { DEFAULT_GAME, GAME_IDS, createEngines, isGameId, type ActionOf, type EngineOf, type GameId } from "@/games/registry";
import type { EngineDeps, GameEngine } from "@/games/types";
import { Ledger } from "@/lib/ledger/ledger";
import type { LedgerEntry } from "@/lib/ledger/types";
import { checkAmount } from "@/lib/money/amount";
import { CHIPS, DEFAULT_CHIP, isChipValue, largestAffordableChip, type ChipClass } from "@/lib/money/chips";
import { cryptoRng, type Rng } from "@/lib/random/rng";
import { receiptPlainText } from "@/lib/receipt/plainText";
import { buildReceipt, type ReceiptData } from "@/lib/receipt/summary";
import { now } from "@/lib/security/trusted";
import { prefersReducedMotion } from "@/lib/timing/motion";
import { createPause } from "@/lib/timing/pause";

export type SessionStatus = "idle" | "opening" | "open" | "closed";

export interface SessionState {
  readonly status: SessionStatus;
  readonly activeGame: GameId;
  readonly chip: number;
}

export interface LedgerSnapshot {
  readonly cash: number;
  readonly onTable: number;
  readonly balance: number;
  readonly buyIn: number;
  readonly net: number;
  readonly broke: boolean;
  readonly entries: readonly LedgerEntry[];
}

export interface ChipOption {
  readonly value: number;
  readonly cls: ChipClass;
  readonly disabled: boolean;
}

export interface ChipState {
  readonly selected: number;
  readonly chips: readonly ChipOption[];
}

export interface SessionReceipt {
  readonly data: ReceiptData;
  readonly text: string;
}

export type SwitchResult = "switched" | "ignored" | "locked";
export type ActivateResult = { readonly ok: true } | { readonly ok: false; readonly activeGame: GameId };

export interface SessionOptions {
  readonly rng?: Rng;
  readonly pause?: (ms: number) => Promise<void>;
  readonly reducedMotion?: () => boolean;
}

export const IDLE_STATE: SessionState = Object.freeze({ status: "idle", activeGame: DEFAULT_GAME, chip: DEFAULT_CHIP });

export const EMPTY_LEDGER: LedgerSnapshot = Object.freeze({
  cash: 0,
  onTable: 0,
  balance: 0,
  buyIn: 0,
  net: 0,
  broke: false,
  entries: Object.freeze([]),
});

export function chipStateFor(selected: number, available: number): ChipState {
  return Object.freeze({
    selected,
    chips: Object.freeze(CHIPS.map((c) => Object.freeze({ value: c.value, cls: c.cls, disabled: c.value > available }))),
  });
}

export const IDLE_CHIPS = chipStateFor(DEFAULT_CHIP, 0);

function listenerSet() {
  const listeners = new Set<() => void>();
  return {
    subscribe(listener: () => void): () => void {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    notify(): void {
      for (const listener of [...listeners]) listener();
    },
  };
}

export function createSession(options: SessionOptions = {}) {
  const reducedMotion = options.reducedMotion ?? prefersReducedMotion;
  const stateChanges = listenerSet();
  const ledgerChanges = listenerSet();
  let state = IDLE_STATE;
  let ledgerSnapshot: LedgerSnapshot | null = null;
  let chipCache = { selected: DEFAULT_CHIP, available: 0, value: IDLE_CHIPS };
  let receipt: SessionReceipt | null = null;
  let closing = false;

  function setState(patch: Partial<SessionState>): void {
    state = Object.freeze({ ...state, ...patch });
    stateChanges.notify();
  }

  const ledger = new Ledger(() => {
    ledgerSnapshot = null;
    const fit = state.chip > ledger.available ? largestAffordableChip(ledger.available) : null;
    if (fit !== null) setState({ chip: fit });
    ledgerChanges.notify();
  });

  const deps: EngineDeps = {
    ledger: createLedgerPort(ledger, ledgerChanges.subscribe),
    rng: options.rng ?? cryptoRng,
    pause: options.pause ?? createPause(reducedMotion),
    getChip: () => state.chip,
    reducedMotion,
  };
  const engines = createEngines(deps);
  const activeEngine = (): GameEngine => engines[state.activeGame];
  const isOpen = () => state.status === "open" && !closing;

  function getLedgerSnapshot(): LedgerSnapshot {
    ledgerSnapshot ??= Object.freeze({
      cash: ledger.available,
      onTable: ledger.reserved,
      balance: ledger.balance,
      buyIn: ledger.buyIn,
      net: ledger.balance - ledger.buyIn,
      broke: ledger.isOpen && ledger.reserved === 0 && largestAffordableChip(ledger.available) === null,
      entries: Object.freeze(ledger.entries()),
    });
    return ledgerSnapshot;
  }

  function getChipState(): ChipState {
    const available = ledger.available;
    if (chipCache.selected !== state.chip || chipCache.available !== available) {
      chipCache = { selected: state.chip, available, value: chipStateFor(state.chip, available) };
    }
    return chipCache.value;
  }

  async function open(amount: number): Promise<boolean> {
    if (state.status !== "idle" || checkAmount(amount)) return false;
    setState({ status: "opening" });
    await ledger.open(amount);
    setState({ status: "open" });
    return true;
  }

  function selectChip(value: number): void {
    if (!isOpen() || !isChipValue(value) || value > ledger.available) return;
    setState({ chip: value });
  }

  function dispatch<K extends GameId>(id: K, action: ActionOf<K>): void {
    if (!isOpen() || id !== state.activeGame) return;
    activeEngine().dispatch(action);
  }

  function requestSwitch(id: GameId): SwitchResult {
    if (!isOpen() || !isGameId(id) || id === state.activeGame) return "ignored";
    const current = activeEngine();
    if (current.isBusy()) return "ignored";
    if (!current.canLeave()) {
      current.announce(current.lockMessage());
      return "locked";
    }
    current.leave();
    setState({ activeGame: id });
    return "switched";
  }

  function activate(id: GameId): ActivateResult {
    if (!isOpen() || id === state.activeGame || requestSwitch(id) === "switched") return { ok: true };
    return { ok: false, activeGame: state.activeGame };
  }

  function requestCashOut(): boolean {
    if (!isOpen()) return false;
    const current = activeEngine();
    if (current.isBusy()) return false;
    if (!current.canLeave()) {
      current.announce(current.lockMessage());
      return false;
    }
    return true;
  }

  async function confirmCashOut(): Promise<boolean> {
    if (!isOpen()) return false;
    const current = activeEngine();
    if (current.isBusy() || !current.canLeave()) return false;
    for (const id of GAME_IDS) {
      const engine: GameEngine = engines[id];
      if (engine.canLeave()) engine.leave();
    }
    if (ledger.reserved !== 0) {
      current.announce("Finish the round in play before cashing out.");
      return false;
    }
    closing = true;
    ledger.close();
    const check = await ledger.verify();
    const data = buildReceipt({
      entries: ledger.entries(),
      buyIn: ledger.buyIn,
      final: ledger.balance,
      startedAt: ledger.startedAt,
      endedAt: now(),
      check,
    });
    receipt = Object.freeze({ data, text: receiptPlainText(data) });
    setState({ status: "closed" });
    return true;
  }

  return {
    subscribe: stateChanges.subscribe,
    getState: (): SessionState => state,
    subscribeLedger: ledgerChanges.subscribe,
    getLedgerSnapshot,
    subscribeChips(listener: () => void): () => void {
      const offState = stateChanges.subscribe(listener);
      const offLedger = ledgerChanges.subscribe(listener);
      return () => {
        offState();
        offLedger();
      };
    },
    getChipState,
    getReceipt: (): SessionReceipt | null => receipt,
    engine: <K extends GameId>(id: K): EngineOf<K> => engines[id],
    open,
    selectChip,
    dispatch,
    requestSwitch,
    activate,
    requestCashOut,
    confirmCashOut,
  };
}

export type Session = ReturnType<typeof createSession>;

export const session: Session = createSession();
