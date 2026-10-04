import { RANKS, SUITS, type Card, type Rank, type Suit } from "@/lib/cards/card";
import type { CardSource } from "@/lib/cards/shoe";

const isRank = (value: string): value is Rank => (RANKS as readonly string[]).includes(value);
const isSuit = (value: string): value is Suit => (SUITS as readonly string[]).includes(value);

export function card(code: string, id = 0): Card {
  const r = code.slice(0, -1);
  const s = code.slice(-1);
  if (!isRank(r) || !isSuit(s)) throw new Error(`Not a card: ${code}`);
  return Object.freeze({ r, s, id });
}

export function hand(codes: string): Card[] {
  return codes.split(/\s+/).filter(Boolean).map((code, i) => card(code, i + 1));
}

export interface StackedShoe extends CardSource {
  low: boolean;
  shuffles: number;
  remaining(): number;
}

/** Deals the given cards in order, e.g. "A♠ 9♥ K♦ 7♣". */
export function stackedShoe(codes: string): StackedShoe {
  const queue = hand(codes);
  let seq = 0;
  return {
    low: false,
    shuffles: 0,
    remaining: () => queue.length,
    shuffle() {
      this.shuffles++;
      this.low = false;
    },
    draw() {
      const next = queue.shift();
      if (!next) throw new Error("Stacked shoe is empty");
      seq++;
      return Object.freeze({ r: next.r, s: next.s, id: seq });
    },
  };
}
