import { fmt } from "@/lib/money/format";
import { itemAt } from "@/lib/security/trusted";
import { EngineBase } from "../engineBase";
import { noCash, resultPhrase } from "../messages";
import { exhaustive, type EngineDeps } from "../types";
import {
  CRAPS_NAME,
  FACES,
  HISTORY_LENGTH,
  SPOT_NAMES,
  SPOT_ORDER,
  TUMBLE_FRAMES,
  TUMBLE_PAUSE,
  allowed,
  isCrapsSpot,
  noBets,
  payText,
  removableSpots,
  resolveRoll,
  rollDetail,
  totalStake,
} from "./rules";
import type { CrapsAction, CrapsSpot, CrapsView, DieFace, PointNumber } from "./types";

export class CrapsEngine extends EngineBase<CrapsView, CrapsAction> {
  readonly id = "craps";
  readonly name = CRAPS_NAME;
  readonly #deps: EngineDeps;
  #bets = noBets();
  #point: PointNumber | null = null;
  #dice: readonly [DieFace | null, DieFace | null] = [null, null];
  #tumbling = false;
  #history: number[] = [];
  #pending: [CrapsSpot, number][] = [];
  #lastPending: [CrapsSpot, number][] = [];
  #busy = false;
  #outcome: Partial<Record<CrapsSpot, number>> | null = null;

  constructor(deps: EngineDeps) {
    super(deps.ledger, "Come-out roll. Bet the pass line or don't pass, then roll.");
    this.#deps = deps;
  }

  dispatch(action: CrapsAction): void {
    if (this.#busy) return;
    switch (action.type) {
      case "bet":
        return this.#place(action.spot);
      case "undo":
        return this.#undo();
      case "clear":
        return this.#clear();
      case "roll":
        return void this.#roll();
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
    return !this.#busy && !this.#locked();
  }

  lockMessage(): string {
    return `Your line bet stays up until the ${this.#point} is rolled or a 7 comes. Keep rolling.`;
  }

  leave(): void {
    const staked = totalStake(this.#bets);
    if (staked && this.#deps.ledger.release(staked)) {
      this.#bets = noBets();
      this.#pending = [];
    }
  }

  protected buildView(): CrapsView {
    const staked = totalStake(this.#bets);
    const [d1, d2] = this.#dice;
    return {
      message: this.msg,
      busy: this.#busy,
      canLeave: this.canLeave(),
      point: this.#point,
      dice: this.#dice,
      tumbling: this.#tumbling,
      sum: d1 && d2 && !this.#tumbling ? d1 + d2 : null,
      history: [...this.#history],
      spots: SPOT_ORDER.map((spot) => ({
        spot,
        name: SPOT_NAMES[spot],
        pay: payText(spot, this.#point),
        stake: this.#bets[spot],
        closed: allowed(spot, 1000, this.#bets, this.#point) !== true && !this.#bets[spot],
        outcome: this.#outcome?.[spot] ?? null,
      })),
      canUndo: !this.#busy && this.#pending.length > 0,
      canClear: !this.#busy && staked > 0,
      canRoll: !this.#busy && staked > 0,
      sameBets:
        !this.#pending.length && this.#lastPending.length && this.#history.length ? { disabled: this.#busy } : null,
    };
  }

  #locked(): boolean {
    return this.#point !== null && (this.#bets.pass > 0 || this.#bets.dontPass > 0);
  }

  #place(spot: CrapsSpot): void {
    if (!isCrapsSpot(spot)) return;
    const chip = this.#deps.getChip();
    const ok = allowed(spot, chip, this.#bets, this.#point);
    if (ok !== true) return this.say(ok);
    if (!this.#deps.ledger.reserve(chip)) return this.say(noCash(chip));
    this.#bets[spot] += chip;
    this.#pending.push([spot, chip]);
    this.#outcome = null;
    this.say(`${SPOT_NAMES[spot]} ${fmt(this.#bets[spot])}. Roll when ready.`);
  }

  #undo(): void {
    const last = this.#pending.pop();
    if (!last) return;
    const [spot, amount] = last;
    this.#deps.ledger.release(amount);
    this.#bets[spot] -= amount;
    const staked = totalStake(this.#bets);
    this.say(staked ? `${fmt(staked)} on the table.` : "No bets down.");
  }

  #clear(): void {
    const removable = removableSpots(this.#point);
    let amount = 0;
    for (const spot of removable) amount += this.#bets[spot];
    if (!amount) {
      return this.say(this.#locked() ? "Line bets can't come down once a point is set." : "No bets to clear.");
    }
    this.#deps.ledger.release(amount);
    for (const spot of removable) this.#bets[spot] = 0;
    this.#pending = [];
    this.say(this.#locked() ? "Cleared what can come down. Your line bet stays up." : "Bets cleared.");
  }

  #rebet(): void {
    if (this.#pending.length || !this.#lastPending.length) return;
    for (const [spot, amount] of this.#lastPending) {
      if (allowed(spot, amount, this.#bets, this.#point) === true && this.#deps.ledger.reserve(amount)) {
        this.#bets[spot] += amount;
        this.#pending.push([spot, amount]);
      }
    }
    void this.#roll();
  }

  #die(): DieFace {
    return itemAt(FACES, this.#deps.rng.int(6));
  }

  async #roll(): Promise<void> {
    if (this.#busy) return;
    if (!totalStake(this.#bets)) return this.say("Place a bet to roll. Start with the pass line.");
    this.#lastPending = [...this.#pending];
    this.#pending = [];
    this.#busy = true;
    this.#outcome = null;
    this.msg = "Rolling…";
    if (!this.#deps.reducedMotion()) {
      this.#tumbling = true;
      for (let i = 0; i < TUMBLE_FRAMES; i++) {
        this.#dice = [this.#die(), this.#die()];
        this.changed();
        await this.#deps.pause(TUMBLE_PAUSE);
      }
      this.#tumbling = false;
    }
    const d1 = this.#die();
    const d2 = this.#die();
    const sum = d1 + d2;
    this.#dice = [d1, d2];
    this.#history.unshift(sum);
    if (this.#history.length > HISTORY_LENGTH) this.#history.pop();

    const roll = resolveRoll(this.#bets, this.#point, d1, d2);
    let wager = 0;
    let net = 0;
    const outcome: Partial<Record<CrapsSpot, number>> = {};
    for (const r of roll.resolved) {
      this.#bets[r.spot] = 0;
      wager += r.wager;
      net += r.net;
      outcome[r.spot] = r.net;
    }
    this.#point = roll.point;
    if (roll.resolved.length) this.#deps.ledger.settle(CRAPS_NAME, wager, net, rollDetail(d1, d2, roll));
    this.#outcome = outcome;
    this.#busy = false;
    const tail = roll.resolved.length ? resultPhrase(net) : this.#point !== null ? "Roll again." : "";
    this.say(`Rolled ${sum}. ${roll.note} ${tail}`.trim());
  }
}
