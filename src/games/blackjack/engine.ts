import type { Card } from "@/lib/cards/card";
import { Shoe, type CardSource } from "@/lib/cards/shoe";
import { fmt } from "@/lib/money/format";
import { cap, listJoin } from "@/lib/text/text";
import { EngineBase } from "../engineBase";
import { noCash, resultPhrase } from "../messages";
import { exhaustive, type EngineDeps } from "../types";
import {
  BLACKJACK_NAME,
  DEALER_PAUSE,
  DEAL_PAUSE,
  DECKS,
  MAX_HANDS,
  RESHUFFLE_BELOW,
  dealerDraws,
  dealerPeeks,
  dealerShowing,
  describeDealer,
  handLabel,
  handTotal,
  isBlackjack,
  isPair,
  roundDetail,
  settleHand,
} from "./rules";
import type { BlackjackAction, BlackjackPhase, BlackjackView, HandOutcome } from "./types";

interface Hand {
  cards: Card[];
  bet: number;
  doubled: boolean;
  done: boolean;
  split: boolean;
  aces: boolean;
  outcome: HandOutcome | null;
}

function newHand(bet: number): Hand {
  return { cards: [], bet, doubled: false, done: false, split: false, aces: false, outcome: null };
}

export class BlackjackEngine extends EngineBase<BlackjackView, BlackjackAction> {
  readonly id = "blackjack";
  readonly name = BLACKJACK_NAME;
  readonly #deps: EngineDeps;
  readonly #shoe: CardSource;
  #phase: BlackjackPhase = "bet";
  #bet = 0;
  #lastBet = 0;
  #hands: Hand[] = [];
  #dealer: Card[] = [];
  #hole = true;
  #active = 0;
  #busy = false;

  constructor(deps: EngineDeps, shoe: CardSource = new Shoe(DECKS, RESHUFFLE_BELOW, deps.rng)) {
    super(deps.ledger, "Pick a chip, then tap the bet circle.");
    this.#deps = deps;
    this.#shoe = shoe;
  }

  dispatch(action: BlackjackAction): void {
    if (this.#busy) return;
    switch (action.type) {
      case "bet":
        return this.#addChip();
      case "clear":
        return this.#clear();
      case "deal":
        return void this.#deal();
      case "rebet":
        return this.#rebet();
      case "hit":
        return this.#hit();
      case "stand":
        return this.#stand();
      case "double":
        return this.#double();
      case "split":
        return this.#split();
      default:
        return exhaustive(action);
    }
  }

  isBusy(): boolean {
    return this.#busy;
  }

  canLeave(): boolean {
    return !this.#busy && !this.#inRound();
  }

  lockMessage(): string {
    return "Finish this hand first.";
  }

  leave(): void {
    if (!this.#bet || !this.#deps.ledger.release(this.#bet)) return;
    this.#bet = 0;
    this.say(this.opening);
  }

  protected buildView(): BlackjackView {
    const inRound = this.#inRound();
    const up = this.#dealer[0];
    return {
      message: this.msg,
      busy: this.#busy,
      canLeave: this.canLeave(),
      phase: this.#phase,
      dealer: {
        cards: [...this.#dealer],
        holeHidden: this.#hole,
        total: !up ? "" : this.#hole ? dealerShowing(up) : handLabel(this.#dealer),
      },
      hands: this.#hands.map((hand, i) => ({
        cards: [...hand.cards],
        label: handLabel(hand.cards, hand.split),
        bet: hand.bet,
        active: this.#phase === "play" && i === this.#active && this.#hands.length > 1,
        outcome: hand.outcome,
      })),
      betting: !inRound,
      bet: this.#bet,
      canAct: this.#canAct(),
      canDouble: this.#canDouble(),
      canSplit: this.#canSplit(),
      canClear: !inRound && this.#bet > 0,
      canDeal: !inRound && this.#bet > 0,
      rebet:
        !inRound && !this.#bet && this.#lastBet && this.#phase === "done"
          ? { amount: this.#lastBet, disabled: this.#deps.ledger.available < this.#lastBet }
          : null,
    };
  }

  #inRound(): boolean {
    return this.#phase === "play" || this.#phase === "dealer";
  }

  get #hand(): Hand | undefined {
    return this.#hands[this.#active];
  }

  #canAct(): boolean {
    const hand = this.#hand;
    return this.#phase === "play" && !this.#busy && !!hand && !hand.done;
  }

  #canDouble(): boolean {
    const hand = this.#hand;
    return this.#canAct() && !!hand && hand.cards.length === 2 && !hand.aces && this.#deps.ledger.available >= hand.bet;
  }

  #canSplit(): boolean {
    const hand = this.#hand;
    return (
      this.#canAct() &&
      !!hand &&
      isPair(hand.cards) &&
      !hand.aces &&
      this.#hands.length < MAX_HANDS &&
      this.#deps.ledger.available >= hand.bet
    );
  }

  #addChip(): void {
    if (this.#inRound()) return;
    const chip = this.#deps.getChip();
    if (!this.#deps.ledger.reserve(chip)) return this.say(noCash(chip));
    this.#bet += chip;
    this.say(`Betting ${fmt(this.#bet)}. Deal when ready.`);
  }

  #clear(): void {
    if (this.#inRound() || !this.#bet) return;
    this.#deps.ledger.release(this.#bet);
    this.#bet = 0;
    this.say("Bet cleared.");
  }

  #rebet(): void {
    if (this.#inRound() || this.#bet || !this.#lastBet) return;
    if (!this.#deps.ledger.reserve(this.#lastBet)) {
      return this.say(`You need ${fmt(this.#lastBet)} in cash to repeat that bet.`);
    }
    this.#bet = this.#lastBet;
    void this.#deal();
  }

  async #deal(): Promise<void> {
    if (this.#inRound()) return;
    if (!this.#bet) return this.say("Place a bet first: pick a chip, then tap the bet circle.");
    let note = "";
    if (this.#shoe.low) {
      this.#shoe.shuffle();
      note = "New shoe. ";
    }
    const hand = newHand(this.#bet);
    this.#lastBet = this.#bet;
    this.#bet = 0;
    this.#hands = [hand];
    this.#dealer = [];
    this.#hole = true;
    this.#active = 0;
    this.#phase = "play";
    this.#busy = true;
    this.msg = `${note}Dealing…`;
    for (const pile of [hand.cards, this.#dealer, hand.cards, this.#dealer]) {
      pile.push(this.#shoe.draw());
      this.changed();
      await this.#deps.pause(DEAL_PAUSE);
    }
    this.#busy = false;
    const up = this.#dealer[0];
    if (isBlackjack(hand.cards) || (up && dealerPeeks(up) && isBlackjack(this.#dealer))) return this.#finish();
    this.#prompt(note);
  }

  #prompt(note = ""): void {
    const hand = this.#hand;
    if (!hand) return;
    const options = ["hit", "stand"];
    if (this.#canDouble()) options.push("double");
    if (this.#canSplit()) options.push("split");
    const which = this.#hands.length > 1 ? `Hand ${this.#active + 1}: ` : "You have ";
    this.say(`${note}${which}${handLabel(hand.cards, hand.split)}. ${cap(listJoin(options))}?`);
  }

  #hit(): void {
    const hand = this.#hand;
    if (!this.#canAct() || !hand) return;
    hand.cards.push(this.#shoe.draw());
    if (handTotal(hand.cards).total >= 21) {
      hand.done = true;
      return this.#next();
    }
    this.#prompt();
  }

  #stand(): void {
    const hand = this.#hand;
    if (!this.#canAct() || !hand) return;
    hand.done = true;
    this.#next();
  }

  #double(): void {
    const hand = this.#hand;
    if (!this.#canDouble() || !hand || !this.#deps.ledger.reserve(hand.bet)) return;
    hand.bet *= 2;
    hand.doubled = true;
    hand.cards.push(this.#shoe.draw());
    hand.done = true;
    this.#next();
  }

  #split(): void {
    const hand = this.#hand;
    if (!this.#canSplit() || !hand) return;
    const [first, second] = hand.cards;
    if (!first || !second || !this.#deps.ledger.reserve(hand.bet)) return;
    const aces = first.r === "A";
    const other = newHand(hand.bet);
    hand.cards = [first];
    other.cards = [second];
    hand.split = other.split = true;
    hand.aces = other.aces = aces;
    this.#hands.splice(this.#active + 1, 0, other);
    hand.cards.push(this.#shoe.draw());
    other.cards.push(this.#shoe.draw());
    if (aces) hand.done = other.done = true;
    this.#next();
  }

  #next(): void {
    for (;;) {
      const i = this.#hands.findIndex((h) => !h.done);
      const hand = this.#hands[i];
      if (!hand) return void this.#dealerTurn();
      if (handTotal(hand.cards).total < 21) {
        this.#active = i;
        return this.#prompt();
      }
      hand.done = true;
    }
  }

  async #dealerTurn(): Promise<void> {
    this.#phase = "dealer";
    this.#busy = true;
    this.#hole = false;
    this.msg = "Dealer's turn.";
    this.changed();
    await this.#deps.pause(DEALER_PAUSE);
    if (this.#hands.some((h) => handTotal(h.cards).total <= 21)) {
      while (dealerDraws(this.#dealer)) {
        this.#dealer.push(this.#shoe.draw());
        this.changed();
        await this.#deps.pause(DEALER_PAUSE);
      }
    }
    this.#finish();
  }

  #finish(): void {
    this.#phase = "done";
    this.#hole = false;
    this.#busy = false;
    let wager = 0;
    let net = 0;
    const outcomes: HandOutcome[] = [];
    for (const hand of this.#hands) {
      hand.outcome = settleHand(hand, this.#dealer);
      outcomes.push(hand.outcome);
      wager += hand.bet;
      net += hand.outcome.net;
    }
    this.#deps.ledger.settle(BLACKJACK_NAME, wager, net, roundDetail(this.#hands, outcomes, this.#dealer));
    this.say(`Dealer: ${describeDealer(this.#dealer)}. ${resultPhrase(net)} Place a new bet or deal the same again.`);
  }
}
