import type { Card, Rank } from "@/lib/cards/card";
import { cap } from "@/lib/text/text";
import type { HandOutcome } from "./types";

export const BLACKJACK_NAME = "Blackjack";
export const DECKS = 6;
export const RESHUFFLE_BELOW = 78;
export const MAX_HANDS = 4;
export const DEAL_PAUSE = 260;
export const DEALER_PAUSE = 450;
export const DEALER_STANDS_ON = 17;

const VALUE: Readonly<Record<Rank, number>> = {
  A: 11,
  "2": 2,
  "3": 3,
  "4": 4,
  "5": 5,
  "6": 6,
  "7": 7,
  "8": 8,
  "9": 9,
  "10": 10,
  J: 10,
  Q: 10,
  K: 10,
};

export interface PlayedHand {
  readonly cards: readonly Card[];
  readonly bet: number;
  readonly split: boolean;
  readonly doubled: boolean;
}

export interface Total {
  readonly total: number;
  readonly soft: boolean;
}

export function rankValue(rank: Rank): number {
  return VALUE[rank];
}

export function handTotal(cards: readonly Card[]): Total {
  let total = 0;
  let aces = 0;
  for (const c of cards) {
    if (c.r === "A") {
      aces++;
      total += 1;
    } else total += rankValue(c.r);
  }
  const soft = aces > 0 && total + 10 <= 21;
  return { total: soft ? total + 10 : total, soft };
}

export function isBlackjack(cards: readonly Card[]): boolean {
  return cards.length === 2 && handTotal(cards).total === 21;
}

export function isPair(cards: readonly Card[]): boolean {
  const [a, b] = cards;
  return cards.length === 2 && !!a && !!b && rankValue(a.r) === rankValue(b.r);
}

export function handLabel(cards: readonly Card[], split = false): string {
  if (!cards.length) return "";
  if (!split && isBlackjack(cards)) return "Blackjack";
  const { total, soft } = handTotal(cards);
  if (total > 21) return `Bust ${total}`;
  return soft && total < 21 ? `${total - 10} / ${total}` : String(total);
}

export function dealerPeeks(up: Card): boolean {
  return up.r === "A" || rankValue(up.r) === 10;
}

export function dealerShowing(up: Card): string {
  return `showing ${up.r === "A" ? "an ace" : rankValue(up.r)}`;
}

export function dealerDraws(cards: readonly Card[]): boolean {
  return handTotal(cards).total < DEALER_STANDS_ON;
}

export function settleHand(hand: PlayedHand, dealer: readonly Card[]): HandOutcome {
  const total = handTotal(hand.cards).total;
  const dealerTotal = handTotal(dealer).total;
  const natural = !hand.split && isBlackjack(hand.cards);
  const dealerNatural = isBlackjack(dealer);
  let net: number;
  let label: HandOutcome["label"];
  if (natural && !dealerNatural) [net, label] = [(hand.bet * 3) / 2, "Blackjack"];
  else if (natural && dealerNatural) [net, label] = [0, "Push"];
  else if (dealerNatural) [net, label] = [-hand.bet, "Lose"];
  else if (total > 21) [net, label] = [-hand.bet, "Bust"];
  else if (dealerTotal > 21 || total > dealerTotal) [net, label] = [hand.bet, "Win"];
  else if (total < dealerTotal) [net, label] = [-hand.bet, "Lose"];
  else [net, label] = [0, "Push"];
  return Object.freeze({ net: Math.round(net), label });
}

export function verdict(net: number): "win" | "lose" | "push" {
  return net > 0 ? "win" : net < 0 ? "lose" : "push";
}

export function describeHand(hand: PlayedHand): string {
  const total = handTotal(hand.cards).total;
  if (!hand.split && isBlackjack(hand.cards)) return "blackjack";
  return `${total}${total > 21 ? ", bust" : ""}${hand.doubled ? ", doubled" : ""}`;
}

export function describeDealer(dealer: readonly Card[]): string {
  if (isBlackjack(dealer)) return "blackjack";
  const total = handTotal(dealer).total;
  return `${total}${total > 21 ? ", bust" : ""}`;
}

export function roundDetail(hands: readonly PlayedHand[], outcomes: readonly HandOutcome[], dealer: readonly Card[]): string {
  const dealerText = describeDealer(dealer);
  const [only] = hands;
  const [onlyOutcome] = outcomes;
  if (hands.length === 1 && only && onlyOutcome) {
    return `You: ${describeHand(only)}. Dealer: ${dealerText}. ${cap(verdict(onlyOutcome.net))}.`;
  }
  const parts = hands.map((hand, i) => `Hand ${i + 1}: ${describeHand(hand)}, ${verdict(outcomes[i]?.net ?? 0)}.`);
  return `Split into ${hands.length} hands. Dealer: ${dealerText}. ${parts.join(" ")}`;
}
