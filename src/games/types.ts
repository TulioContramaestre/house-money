import type { Rng } from "@/lib/random/rng";

export interface LedgerPort {
  readonly available: number;
  reserve(amount: number): boolean;
  release(amount: number): boolean;
  settle(game: string, wager: number, net: number, detail: string): void;
  subscribe(listener: () => void): () => void;
}

export interface EngineDeps {
  readonly ledger: LedgerPort;
  readonly rng: Rng;
  readonly pause: (ms: number) => Promise<void>;
  readonly getChip: () => number;
  readonly reducedMotion: () => boolean;
}

export interface BaseView {
  readonly message: string;
  readonly busy: boolean;
  readonly canLeave: boolean;
}

export interface RebetView {
  readonly amount: number;
  readonly disabled: boolean;
}

export interface GameAction {
  readonly type: string;
}

export interface GameEngine<TView extends BaseView = BaseView, TAction extends GameAction = GameAction> {
  readonly id: string;
  readonly name: string;
  subscribe(listener: () => void): () => void;
  getView(): Readonly<TView>;
  dispatch(action: TAction): void;
  isBusy(): boolean;
  canLeave(): boolean;
  lockMessage(): string;
  announce(message: string): void;
  leave(): void;
}

export interface GameUiProps<TView, TAction> {
  readonly view: Readonly<TView>;
  readonly dispatch: (action: TAction) => void;
}

export function exhaustive(value: never): void {
  void value;
}
