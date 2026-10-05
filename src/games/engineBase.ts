import type { BaseView, GameAction, GameEngine, LedgerPort } from "./types";

export abstract class EngineBase<TView extends BaseView, TAction extends GameAction> implements GameEngine<TView, TAction> {
  abstract readonly id: string;
  abstract readonly name: string;
  protected msg: string;
  protected readonly opening: string;
  readonly #listeners = new Set<() => void>();
  #view: Readonly<TView> | null = null;

  constructor(ledger: Pick<LedgerPort, "subscribe">, message: string) {
    this.msg = message;
    this.opening = message;
    ledger.subscribe(() => this.changed());
  }

  readonly subscribe = (listener: () => void): (() => void) => {
    this.#listeners.add(listener);
    return () => {
      this.#listeners.delete(listener);
    };
  };

  readonly getView = (): Readonly<TView> => {
    this.#view ??= Object.freeze(this.buildView());
    return this.#view;
  };

  announce(message: string): void {
    this.say(message);
  }

  protected say(message: string): void {
    this.msg = message;
    this.changed();
  }

  protected changed(): void {
    this.#view = null;
    for (const listener of [...this.#listeners]) listener();
  }

  protected abstract buildView(): TView;
  abstract dispatch(action: TAction): void;
  abstract isBusy(): boolean;
  abstract canLeave(): boolean;
  abstract lockMessage(): string;
  abstract leave(): void;
}
