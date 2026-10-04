import type { Card } from "@/lib/cards/card";
import { Shoe, type CardSource } from "@/lib/cards/shoe";
import { fmt } from "@/lib/money/format";
import { cap } from "@/lib/text/text";
import { EngineBase } from "../engineBase";
import { noCash, resultPhrase } from "../messages";
import { exhaustive, type EngineDeps } from "../types";
import {
  BACCARAT_NAME,
  DEAL_PAUSE,
  DECKS,
  DRAW_PAUSE,
  RESHUFFLE_BELOW,
  ROAD_LENGTH,
  ROAD_MARK,
  SPOTS,
  bankerDraws,
  betSummary,
  cardPoints,
  handPoints,
  headline,
  isBaccaratSpot,
  isNatural,
  noBets,
  payouts,
  playerDraws,
  totalStake,
  winnerOf,
} from "./rules";
import type { BaccaratAction, BaccaratBets, BaccaratPhase, BaccaratSideView, BaccaratSpot, BaccaratView, RoadMark } from "./types";

export class BaccaratEngine extends EngineBase<BaccaratView, BaccaratAction> {
  readonly id = "baccarat";
  readonly name = BACCARAT_NAME;
  readonly #deps: EngineDeps;
  readonly #shoe: CardSource;
  #bets = noBets();
  #live: BaccaratBets | null = null;
  #last: BaccaratBets | null = null;
  #pending: [BaccaratSpot, number][] = [];
  #phase: BaccaratPhase = "bet";
  #player: Card[] = [];
  #banker: Card[] = [];
  #busy = false;
  #road: RoadMark[] = [];
  #outcome: BaccaratBets | null = null;
  #winner: BaccaratSpot | null = null;

  constructor(deps: EngineDeps, shoe: CardSource = new Shoe(DECKS, RESHUFFLE_BELOW, deps.rng)) {
    super(deps.ledger, "Bet on player, banker or tie, then deal.");
    this.#deps = deps;
    this.#shoe = shoe;
  }

  dispatch(action: BaccaratAction): void {
    if (this.#busy) return;
    switch (action.type) {
      case "bet":
        return this.#place(action.spot);
      case "undo":
        return this.#undo();
      case "clear":
        return this.#clear();
      case "deal":
        return void this.#deal();
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
    return "Wait for this hand to finish.";
  }

  leave(): void {
    const staked = totalStake(this.#bets);
    if (staked && this.#deps.ledger.release(staked)) {
      this.#bets = noBets();
      this.#pending = [];
    }
  }

  protected buildView(): BaccaratView {
    const staked = totalStake(this.#bets);
    const live = this.#live;
    const shown = live && this.#phase !== "bet" && !staked ? live : this.#bets;
    const done = this.#phase === "done";
    const side = (cards: readonly Card[], key: BaccaratSpot): BaccaratSideView => ({
      cards: [...cards],
      total: cards.length ? handPoints(cards) : null,
      won: this.#winner === key || (this.#winner === "tie" && done),
    });
    const last = this.#last;
    const lastTotal = last ? totalStake(last) : 0;
    return {
      message: this.msg,
      busy: this.#busy,
      canLeave: this.canLeave(),
      phase: this.#phase,
      player: side(this.#player, "player"),
      banker: side(this.#banker, "banker"),
      spots: SPOTS.map(({ spot, name, pay }) => ({
        spot,
        name,
        pay,
        stake: shown[spot],
        outcome: this.#outcome && live && live[spot] && !staked ? this.#outcome[spot] : null,
        won: this.#winner === spot && done,
      })),
      road: [...this.#road],
      canUndo: !this.#busy && this.#pending.length > 0,
      canClear: !this.#busy && staked > 0,
      canDeal: !this.#busy && staked > 0,
      rebet:
        !staked && last && done
          ? { amount: lastTotal, disabled: this.#busy || this.#deps.ledger.available < lastTotal }
          : null,
    };
  }

  #place(spot: BaccaratSpot): void {
    if (!isBaccaratSpot(spot)) return;
    const chip = this.#deps.getChip();
    if (!this.#deps.ledger.reserve(chip)) return this.say(noCash(chip));
    if (this.#phase === "done") {
      this.#outcome = null;
      this.#live = null;
    }
    this.#bets[spot] += chip;
    this.#pending.push([spot, chip]);
    this.say(`${cap(betSummary(this.#bets))}. Deal when ready.`);
  }

  #undo(): void {
    const last = this.#pending.pop();
    if (!last) return;
    const [spot, amount] = last;
    this.#deps.ledger.release(amount);
    this.#bets[spot] -= amount;
    this.say(totalStake(this.#bets) ? `${cap(betSummary(this.#bets))}.` : "No bets down.");
  }

  #clear(): void {
    const staked = totalStake(this.#bets);
    if (!staked) return;
    this.#deps.ledger.release(staked);
    this.#bets = noBets();
    this.#pending = [];
    this.say("Bets cleared.");
  }

  #rebet(): void {
    const last = this.#last;
    if (totalStake(this.#bets) || !last) return;
    const total = totalStake(last);
    if (!this.#deps.ledger.reserve(total)) return this.say(`You need ${fmt(total)} in cash to repeat those bets.`);
    this.#bets = { ...last };
    this.#pending = [];
    void this.#deal();
  }

  async #deal(): Promise<void> {
    if (this.#busy) return;
    const stake = totalStake(this.#bets);
    if (!stake) return this.say("Place a bet first: pick a chip, then tap player, banker or tie.");
    let note = "";
    if (this.#shoe.low) {
      this.#shoe.shuffle();
      note = "New shoe. ";
    }
    const bets: BaccaratBets = { ...this.#bets };
    this.#last = bets;
    this.#live = bets;
    this.#bets = noBets();
    this.#pending = [];
    this.#outcome = null;
    this.#winner = null;
    this.#player = [];
    this.#banker = [];
    this.#phase = "dealing";
    this.#busy = true;
    this.msg = `${note}Dealing…`;
    for (const pile of [this.#player, this.#banker, this.#player, this.#banker]) {
      pile.push(this.#shoe.draw());
      this.changed();
      await this.#deps.pause(DEAL_PAUSE);
    }
    const natural = isNatural(handPoints(this.#player), handPoints(this.#banker));
    if (!natural) {
      let playerThird: number | null = null;
      if (playerDraws(handPoints(this.#player))) {
        const third = this.#shoe.draw();
        this.#player.push(third);
        playerThird = cardPoints(third);
        this.changed();
        await this.#deps.pause(DRAW_PAUSE);
      }
      if (bankerDraws(handPoints(this.#banker), playerThird)) {
        this.#banker.push(this.#shoe.draw());
        this.changed();
        await this.#deps.pause(DRAW_PAUSE);
      }
    }
    const playerTotal = handPoints(this.#player);
    const bankerTotal = handPoints(this.#banker);
    const winner = winnerOf(playerTotal, bankerTotal);
    const nets = payouts(bets, winner);
    const net = nets.player + nets.banker + nets.tie;
    const head = headline(winner, playerTotal, bankerTotal, natural);
    this.#deps.ledger.settle(BACCARAT_NAME, stake, net, `${head}. Bets on ${betSummary(bets)}.`);
    this.#road.push(ROAD_MARK[winner]);
    if (this.#road.length > ROAD_LENGTH) this.#road.shift();
    this.#outcome = nets;
    this.#winner = winner;
    this.#phase = "done";
    this.#busy = false;
    this.say(`${head}. ${resultPhrase(net)}`);
  }
}
