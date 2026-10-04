import type { Card, Rank } from "@/lib/cards/card";
import { fmt } from "@/lib/money/format";
import { cap } from "@/lib/text/text";
import type { BaccaratBets, BaccaratSpot, RoadMark } from "./types";

export const BACCARAT_NAME = "Baccarat";
export const DECKS = 8;
export const RESHUFFLE_BELOW = 70;
export const DEAL_PAUSE = 320;
export const DRAW_PAUSE = 450;
export const ROAD_LENGTH = 40;

export const SPOTS: readonly { readonly spot: BaccaratSpot; readonly name: string; readonly pay: string }[] = [
  { spot: "player", name: "Player", pay: "1 to 1" },
  { spot: "tie", name: "Tie", pay: "8 to 1" },
  { spot: "banker", name: "Banker", pay: "0.95 to 1" },
];

export const ROAD_MARK: Readonly<Record<BaccaratSpot, RoadMark>> = { player: "P", banker: "B", tie: "T" };

const POINTS: Readonly<Record<Rank, number>> = {
  A: 1,
  "2": 2,
  "3": 3,
  "4": 4,
  "5": 5,
  "6": 6,
  "7": 7,
  "8": 8,
  "9": 9,
  "10": 0,
  J: 0,
  Q: 0,
  K: 0,
};

export function isBaccaratSpot(value: string): value is BaccaratSpot {
  return value === "player" || value === "tie" || value === "banker";
}

export function noBets(): Record<BaccaratSpot, number> {
  return { player: 0, banker: 0, tie: 0 };
}

export function totalStake(bets: BaccaratBets): number {
  return bets.player + bets.banker + bets.tie;
}

export function cardPoints(card: Card): number {
  return POINTS[card.r];
}

export function handPoints(cards: readonly Card[]): number {
  let total = 0;
  for (const c of cards) total += cardPoints(c);
  return total % 10;
}

export function isNatural(player: number, banker: number): boolean {
  return player >= 8 || banker >= 8;
}

export function playerDraws(player: number): boolean {
  return player <= 5;
}

export function bankerDraws(banker: number, playerThird: number | null): boolean {
  if (playerThird === null) return banker <= 5;
  if (banker <= 2) return true;
  if (banker === 3) return playerThird !== 8;
  if (banker === 4) return playerThird >= 2 && playerThird <= 7;
  if (banker === 5) return playerThird >= 4 && playerThird <= 7;
  if (banker === 6) return playerThird === 6 || playerThird === 7;
  return false;
}

export function winnerOf(player: number, banker: number): BaccaratSpot {
  return player > banker ? "player" : banker > player ? "banker" : "tie";
}

export function payouts(bets: BaccaratBets, winner: BaccaratSpot): Record<BaccaratSpot, number> {
  return {
    player: !bets.player ? 0 : winner === "player" ? bets.player : winner === "tie" ? 0 : -bets.player,
    banker: !bets.banker ? 0 : winner === "banker" ? Math.round((bets.banker * 19) / 20) : winner === "tie" ? 0 : -bets.banker,
    tie: !bets.tie ? 0 : winner === "tie" ? bets.tie * 8 : -bets.tie,
  };
}

export function headline(winner: BaccaratSpot, player: number, banker: number, natural: boolean): string {
  const lead =
    winner === "tie"
      ? `Tie at ${player}`
      : `${cap(winner)} wins ${Math.max(player, banker)} to ${Math.min(player, banker)}`;
  return lead + (natural ? ", a natural" : "");
}

export function betSummary(bets: BaccaratBets): string {
  return SPOTS.filter(({ spot }) => bets[spot])
    .map(({ spot }) => `${spot} ${fmt(bets[spot])}`)
    .join(", ");
}
