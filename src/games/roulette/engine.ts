import { fmt } from "@/lib/money/format";
import { itemAt } from "@/lib/security/trusted";
import { EngineBase } from "../engineBase";
import { noCash, resultPhrase } from "../messages";
import { exhaustive, type EngineDeps } from "../types";
import {
  HISTORY_LENGTH,
  NUMBERS,
  POCKETS,
  REST,
  ROULETTE_NAME,
  SPIN_TIMEOUT,
  betName,
  colorOf,
  isRouletteBetKey,
  multiplier,
  restIndex,
  spinTargetIndex,
  straightKey,
} from "./rules";
import type { RouletteAction, RouletteBetKey, RouletteCellView, RouletteNumber, RouletteView } from "./types";

type Bets = Map<RouletteBetKey, number>;

function total(bets: ReadonlyMap<RouletteBetKey, number>): number {
  let sum = 0;
  for (const amount of bets.values()) sum += amount;
  return sum;
}

export class RouletteEngine extends EngineBase<RouletteView, RouletteAction> {
  readonly id = "roulette";
  readonly name = ROULETTE_NAME;
  readonly #deps: EngineDeps;
  #bets: Bets = new Map();
  #live: ReadonlyMap<RouletteBetKey, number> | null = null;
  #last: ReadonlyMap<RouletteBetKey, number> | null = null;
  #pending: [RouletteBetKey, number][] = [];
  #busy = false;
  #history: RouletteNumber[] = [];
  #stripIndex = REST;
  #spinTarget: number | null = null;
  #settle: (() => void) | null = null;
  #result: RouletteNumber | null = null;
  #outcome: ReadonlyMap<RouletteBetKey, number> | null = null;

  constructor(deps: EngineDeps) {
    super(deps.ledger, "Place chips on the layout, then spin.");
    this.#deps = deps;
  }

  dispatch(action: RouletteAction): void {
    if (action.type === "spinSettled") {
      this.#settle?.();
      return;
    }
    if (this.#busy) return;
    switch (action.type) {
      case "bet":
        return this.#place(action.key);
      case "undo":
        return this.#undo();
      case "clear":
        return this.#clear();
      case "spin":
        return void this.#spin();
      case "rebet":
        return this.#rebet();
      default:
        return exhaustive(action);
    }
  }

  isBusy(): boolean {
    return this.#busy;
  }

  canLeave(): boolean {
    return !this.#busy;
  }

  lockMessage(): string {
    return "Wait for the ball to land.";
  }

  leave(): void {
    const staked = total(this.#bets);
    if (staked && this.#deps.ledger.release(staked)) {
      this.#bets = new Map();
      this.#pending = [];
      this.say(this.opening);
    }
  }

  protected buildView(): RouletteView {
    const staked = total(this.#bets);
    const cells: Partial<Record<RouletteBetKey, RouletteCellView>> = {};
    if (staked) {
      for (const [key, amount] of this.#bets) cells[key] = { amount, paid: false };
    } else if (this.#live) {
      for (const [key, amount] of this.#live) {
        const paid = (this.#outcome?.get(key) ?? 0) > 0;
        const shown = this.#outcome ? (paid ? amount : 0) : amount;
        if (shown) cells[key] = { amount: shown, paid };
      }
    }
    const result = this.#result;
    const last = this.#last;
    const lastTotal = last ? total(last) : 0;
    return {
      message: this.msg,
      busy: this.#busy,
      canLeave: this.canLeave(),
      phase: this.#busy ? "spinning" : "betting",
      stripIndex: this.#stripIndex,
      spinTarget: this.#spinTarget,
      result: result === null ? null : { n: result, color: colorOf(result) },
      history: this.#history.map((n) => ({ n, color: colorOf(n) })),
      cells,
      hit: result !== null && !staked ? straightKey(result) : null,
      canUndo: !this.#busy && this.#pending.length > 0,
      canClear: !this.#busy && staked > 0,
      canSpin: !this.#busy && staked > 0,
      rebet:
        !staked && last && result !== null
          ? { amount: lastTotal, disabled: this.#busy || this.#deps.ledger.available < lastTotal }
          : null,
    };
  }

  #place(key: RouletteBetKey): void {
    if (!isRouletteBetKey(key)) return;
    const chip = this.#deps.getChip();
    if (!this.#deps.ledger.reserve(chip)) return this.say(noCash(chip));
    if (!total(this.#bets)) {
      this.#outcome = null;
      this.#live = null;
    }
    const amount = (this.#bets.get(key) ?? 0) + chip;
    this.#bets.set(key, amount);
    this.#pending.push([key, chip]);
    this.say(`${fmt(amount)} on ${betName(key)}. ${fmt(total(this.#bets))} on the layout.`);
  }

  #undo(): void {
    const last = this.#pending.pop();
    if (!last) return;
    const [key, amount] = last;
    this.#deps.ledger.release(amount);
    const left = (this.#bets.get(key) ?? 0) - amount;
    if (left) this.#bets.set(key, left);
    else this.#bets.delete(key);
    const staked = total(this.#bets);
    this.say(staked ? `${fmt(staked)} on the layout.` : "No bets down.");
  }

  #clear(): void {
    const staked = total(this.#bets);
    if (!staked) return;
    this.#deps.ledger.release(staked);
    this.#bets = new Map();
    this.#pending = [];
    this.say("Bets cleared.");
  }

  #rebet(): void {
    const last = this.#last;
    if (total(this.#bets) || !last) return;
    const amount = total(last);
    if (!this.#deps.ledger.reserve(amount)) return this.say(`You need ${fmt(amount)} in cash to repeat those bets.`);
    this.#bets = new Map(last);
    this.#pending = [];
    void this.#spin();
  }

  async #spin(): Promise<void> {
    if (this.#busy) return;
    const stake = total(this.#bets);
    if (!stake) return this.say("Place a bet first: pick a chip, then tap the layout.");
    const n = itemAt(NUMBERS, this.#deps.rng.int(POCKETS));
    const bets: ReadonlyMap<RouletteBetKey, number> = new Map(this.#bets);
    this.#last = bets;
    this.#live = bets;
    this.#bets = new Map();
    this.#pending = [];
    this.#outcome = null;
    this.#result = null;
    this.#busy = true;
    this.msg = "No more bets.";
    if (this.#deps.reducedMotion()) {
      this.changed();
    } else {
      const landed = new Promise<void>((resolve) => {
        this.#settle = resolve;
      });
      this.#spinTarget = spinTargetIndex(n);
      this.changed();
      await Promise.race([landed, this.#deps.pause(SPIN_TIMEOUT)]);
      this.#settle = null;
      this.#spinTarget = null;
    }
    this.#stripIndex = restIndex(n);
    let net = 0;
    const paid: string[] = [];
    const lost: string[] = [];
    const outcome = new Map<RouletteBetKey, number>();
    for (const [key, amount] of bets) {
      const m = multiplier(key, n);
      const result = m > 0 ? amount * m : -amount;
      net += result;
      outcome.set(key, result);
      (m > 0 ? paid : lost).push(betName(key));
    }
    const color = colorOf(n);
    const detail =
      `Landed ${n} ${color}.` +
      (paid.length ? ` Paid: ${paid.join(", ")}.` : "") +
      (lost.length ? ` Lost: ${lost.join(", ")}.` : "");
    this.#deps.ledger.settle(ROULETTE_NAME, stake, net, detail);
    this.#result = n;
    this.#outcome = outcome;
    this.#history.unshift(n);
    if (this.#history.length > HISTORY_LENGTH) this.#history.pop();
    this.#busy = false;
    this.say(`${n} ${color}. ${resultPhrase(net)}`);
  }
}
