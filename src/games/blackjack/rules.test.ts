import { describe, expect, test } from "vitest";
import { card, hand } from "@/test/stackedShoe";
import {
  dealerDraws,
  dealerPeeks,
  dealerShowing,
  describeDealer,
  describeHand,
  handLabel,
  handTotal,
  isBlackjack,
  isPair,
  roundDetail,
  settleHand,
  type PlayedHand,
} from "./rules";

const played = (codes: string, bet = 1000, extra: Partial<PlayedHand> = {}): PlayedHand => ({
  cards: hand(codes),
  bet,
  split: false,
  doubled: false,
  ...extra,
});

describe("handTotal", () => {
  test.each([
    ["A♠ 6♥", 17, true],
    ["A♠ 6♥ 10♦", 17, false],
    ["A♠ A♥", 12, true],
    ["A♠ A♥ 9♦", 21, true],
    ["A♠ A♥ A♦ A♣ 7♠", 21, true],
    ["10♠ 6♥ A♦", 17, false],
    ["K♠ Q♥", 20, false],
    ["K♠ Q♥ 2♦", 22, false],
    ["5♠ 5♥", 10, false],
  ])("%s → %d (soft %s)", (codes, total, soft) => {
    expect(handTotal(hand(codes))).toEqual({ total, soft });
  });
});

describe("isBlackjack and isPair", () => {
  test("blackjack is an ace and a ten-value card, in two cards", () => {
    expect(isBlackjack(hand("A♠ K♥"))).toBe(true);
    expect(isBlackjack(hand("10♦ A♣"))).toBe(true);
    expect(isBlackjack(hand("A♠ 5♥ 5♦"))).toBe(false);
    expect(isBlackjack(hand("K♠ Q♥"))).toBe(false);
  });

  test("pairs are split by value", () => {
    expect(isPair(hand("8♠ 8♥"))).toBe(true);
    expect(isPair(hand("10♠ K♥"))).toBe(true);
    expect(isPair(hand("8♠ 9♥"))).toBe(false);
    expect(isPair(hand("8♠ 8♥ 8♦"))).toBe(false);
  });
});

describe("handLabel", () => {
  test.each([
    ["", false, ""],
    ["A♠ K♥", false, "Blackjack"],
    ["A♠ K♥", true, "21"],
    ["A♠ 6♥", false, "7 / 17"],
    ["A♠ 6♥ 4♦", false, "21"],
    ["10♠ 8♥", false, "18"],
    ["10♠ 8♥ 4♦", false, "Bust 22"],
  ])("%j split=%s → %j", (codes, split, label) => {
    expect(handLabel(hand(codes), split)).toBe(label);
  });
});

describe("dealer", () => {
  test("peeks with an ace or a ten-value card up", () => {
    for (const code of ["A♠", "10♥", "J♦", "Q♣", "K♠"]) expect(dealerPeeks(card(code))).toBe(true);
    for (const code of ["2♠", "9♥"]) expect(dealerPeeks(card(code))).toBe(false);
  });

  test("describes the upcard", () => {
    expect(dealerShowing(card("A♠"))).toBe("showing an ace");
    expect(dealerShowing(card("Q♥"))).toBe("showing 10");
    expect(dealerShowing(card("7♦"))).toBe("showing 7");
  });

  test("stands on all 17s, including soft 17", () => {
    expect(dealerDraws(hand("10♠ 6♥"))).toBe(true);
    expect(dealerDraws(hand("A♠ 6♥"))).toBe(false);
    expect(dealerDraws(hand("10♠ 7♥"))).toBe(false);
    expect(dealerDraws(hand("A♠ 5♥"))).toBe(true);
  });

  test("describes the final dealer hand", () => {
    expect(describeDealer(hand("A♠ K♥"))).toBe("blackjack");
    expect(describeDealer(hand("10♠ 6♥ 9♦"))).toBe("25, bust");
    expect(describeDealer(hand("10♠ 8♥"))).toBe("18");
  });
});

describe("settleHand", () => {
  test.each([
    ["blackjack pays 3:2", played("A♠ K♥", 10_000), "10♦ 8♣", { net: 15_000, label: "Blackjack" }],
    ["blackjack against blackjack pushes", played("A♠ K♥"), "A♦ Q♣", { net: 0, label: "Push" }],
    ["dealer blackjack beats 21", played("7♠ 7♥ 7♦"), "A♦ Q♣", { net: -1000, label: "Lose" }],
    ["bust loses even if the dealer busts", played("10♠ 6♥ 9♦"), "10♦ 6♣ 8♠", { net: -1000, label: "Bust" }],
    ["dealer bust pays", played("10♠ 2♥"), "10♦ 6♣ 8♠", { net: 1000, label: "Win" }],
    ["higher total wins", played("10♠ 9♥"), "10♦ 8♣", { net: 1000, label: "Win" }],
    ["lower total loses", played("10♠ 7♥"), "10♦ 8♣", { net: -1000, label: "Lose" }],
    ["equal totals push", played("10♠ 8♥"), "10♦ 8♣", { net: 0, label: "Push" }],
    ["split 21 is not blackjack", played("A♠ K♥", 1000, { split: true }), "10♦ 9♣", { net: 1000, label: "Win" }],
  ])("%s", (_, playedHand, dealer, outcome) => {
    expect(settleHand(playedHand, hand(dealer))).toEqual(outcome);
  });
});

describe("log detail", () => {
  test("describes a single hand", () => {
    expect(describeHand(played("A♠ K♥"))).toBe("blackjack");
    expect(describeHand(played("10♠ 6♥ 9♦"))).toBe("25, bust");
    expect(describeHand(played("5♠ 6♥ 10♦", 2000, { doubled: true }))).toBe("21, doubled");
    expect(describeHand(played("5♠ 6♥ K♦ 2♣", 2000, { doubled: true }))).toBe("23, bust, doubled");
    const single = played("10♠ 9♥");
    expect(roundDetail([single], [{ net: 1000, label: "Win" }], hand("10♦ 8♣"))).toBe("You: 19. Dealer: 18. Win.");
  });

  test("describes split hands", () => {
    const hands = [played("8♠ 3♥", 1000, { split: true }), played("8♦ 10♣", 1000, { split: true })];
    const detail = roundDetail(hands, [{ net: -1000, label: "Lose" }, { net: 0, label: "Push" }], hand("10♦ 8♣"));
    expect(detail).toBe("Split into 2 hands. Dealer: 18. Hand 1: 11, lose. Hand 2: 18, push.");
  });
});
