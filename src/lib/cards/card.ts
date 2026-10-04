export const RANKS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"] as const;
export const SUITS = ["♠", "♥", "♦", "♣"] as const;

export type Rank = (typeof RANKS)[number];
export type Suit = (typeof SUITS)[number];

export interface Card {
  readonly r: Rank;
  readonly s: Suit;
  readonly id: number;
}

export function isRed(suit: Suit): boolean {
  return suit === "♥" || suit === "♦";
}

export function newestId(...piles: readonly (readonly Card[])[]): number {
  let newest = 0;
  for (const pile of piles) {
    for (const card of pile) if (card.id > newest) newest = card.id;
  }
  return newest;
}
