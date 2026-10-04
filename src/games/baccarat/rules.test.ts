import { describe, expect, test } from "vitest";
import { card, hand } from "@/test/stackedShoe";
import { bankerDraws, betSummary, cardPoints, handPoints, headline, isNatural, payouts, playerDraws, winnerOf } from "./rules";

describe("points", () => {
  test("aces count 1, tens and faces 0, the rest face value", () => {
    expect(["A♠", "2♥", "9♦", "10♣", "J♠", "Q♥", "K♦"].map((c) => cardPoints(card(c)))).toEqual([1, 2, 9, 0, 0, 0, 0]);
  });

  test("hands keep only the last digit", () => {
    expect(handPoints(hand("7♠ 8♥"))).toBe(5);
    expect(handPoints(hand("K♠ 9♥"))).toBe(9);
    expect(handPoints(hand("5♠ 5♥"))).toBe(0);
    expect(handPoints(hand("9♠ 9♥ 9♦"))).toBe(7);
  });

  test("a natural is 8 or 9 on either side", () => {
    expect(isNatural(8, 0)).toBe(true);
    expect(isNatural(2, 9)).toBe(true);
    expect(isNatural(7, 7)).toBe(false);
  });
});

describe("drawing rules", () => {
  test("player draws on 0–5 and stands on 6–7", () => {
    expect([0, 1, 2, 3, 4, 5, 6, 7].map(playerDraws)).toEqual([true, true, true, true, true, true, false, false]);
  });

  test("banker with no player third card draws on 0–5", () => {
    expect([0, 1, 2, 3, 4, 5, 6, 7].map((b) => bankerDraws(b, null))).toEqual([true, true, true, true, true, true, false, false]);
  });

  // D = draw, S = stand, for the player's third card 0 through 9.
  const TABLEAU: Record<number, string> = {
    0: "DDDDDDDDDD",
    1: "DDDDDDDDDD",
    2: "DDDDDDDDDD",
    3: "DDDDDDDDSD",
    4: "SSDDDDDDSS",
    5: "SSSSDDDDSS",
    6: "SSSSSSDDSS",
    7: "SSSSSSSSSS",
  };

  test.each(Object.entries(TABLEAU))("banker on %s follows the tableau", (banker, row) => {
    const actual = Array.from({ length: 10 }, (_, p3) => (bankerDraws(Number(banker), p3) ? "D" : "S")).join("");
    expect(actual).toBe(row);
  });
});

describe("settlement", () => {
  test("names the winner", () => {
    expect(winnerOf(9, 7)).toBe("player");
    expect(winnerOf(3, 6)).toBe("banker");
    expect(winnerOf(5, 5)).toBe("tie");
  });

  test("player pays 1:1, banker 0.95:1, tie 8:1", () => {
    const bets = { player: 10_000, banker: 20_000, tie: 1000 };
    expect(payouts(bets, "player")).toEqual({ player: 10_000, banker: -20_000, tie: -1000 });
    expect(payouts(bets, "banker")).toEqual({ player: -10_000, banker: 19_000, tie: -1000 });
  });

  test("a tie pushes player and banker bets", () => {
    expect(payouts({ player: 5000, banker: 5000, tie: 1000 }, "tie")).toEqual({ player: 0, banker: 0, tie: 8000 });
  });

  test("banker commission stays whole on every stake", () => {
    expect(payouts({ player: 0, banker: 1000, tie: 0 }, "banker").banker).toBe(950);
    expect(payouts({ player: 0, banker: 7000, tie: 0 }, "banker").banker).toBe(6650);
  });

  test("headline and bet summary match the log format", () => {
    expect(headline("player", 9, 7, false)).toBe("Player wins 9 to 7");
    expect(headline("banker", 2, 8, true)).toBe("Banker wins 8 to 2, a natural");
    expect(headline("tie", 6, 6, false)).toBe("Tie at 6");
    expect(betSummary({ player: 5000, banker: 2000, tie: 1000 })).toBe("player 5,000, tie 1,000, banker 2,000");
    expect(betSummary({ player: 0, banker: 2000, tie: 0 })).toBe("banker 2,000");
  });
});
