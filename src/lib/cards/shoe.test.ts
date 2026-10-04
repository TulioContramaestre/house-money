import { describe, expect, test } from "vitest";
import { seededRng, type Rng } from "@/lib/random/rng";
import { scriptedRng } from "@/test/scriptedRng";
import { RANKS, SUITS, isRed, type Card } from "./card";
import { Shoe } from "./shoe";

const noSwaps: Rng = { int: (n) => n - 1 };

function drawAll(shoe: Shoe, count: number): Card[] {
  return Array.from({ length: count }, () => shoe.draw());
}

describe("Shoe", () => {
  test("holds every card once per deck", () => {
    const cards = drawAll(new Shoe(6, 0, seededRng(1)), 312);
    const counts = new Map<string, number>();
    for (const c of cards) counts.set(c.r + c.s, (counts.get(c.r + c.s) ?? 0) + 1);
    expect(counts.size).toBe(52);
    for (const r of RANKS) for (const s of SUITS) expect(counts.get(r + s)).toBe(6);
  });

  test("Fisher-Yates asks for int(i + 1) from the top down", () => {
    const rng = scriptedRng([], noSwaps);
    new Shoe(1, 0, rng);
    expect(rng.requested).toEqual(Array.from({ length: 51 }, (_, k) => 52 - k));
  });

  test("draws from the end of the shuffled order, like pop()", () => {
    const shoe = new Shoe(1, 0, noSwaps);
    expect(drawAll(shoe, 3).map((c) => c.r + c.s)).toEqual(["K♣", "Q♣", "J♣"]);
  });

  test("applies the swaps the rng picks", () => {
    const shoe = new Shoe(1, 0, scriptedRng([0], noSwaps));
    const top = shoe.draw();
    expect(top.r + top.s).toBe("A♠");
  });

  test("gives cards unique, increasing ids and freezes them", () => {
    const cards = drawAll(new Shoe(1, 0, seededRng(3)), 10);
    expect(cards.map((c) => c.id)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    for (const c of cards) expect(Object.isFrozen(c)).toBe(true);
  });

  test("reports low once fewer cards than the cut remain", () => {
    const shoe = new Shoe(1, 10, seededRng(4));
    drawAll(shoe, 42);
    expect(shoe.low).toBe(false);
    shoe.draw();
    expect(shoe.low).toBe(true);
    shoe.shuffle();
    expect(shoe.low).toBe(false);
  });

  test("reshuffles instead of running dry", () => {
    const shoe = new Shoe(1, 0, seededRng(5));
    const cards = drawAll(shoe, 60);
    expect(cards).toHaveLength(60);
    expect(cards[59]?.id).toBe(60);
  });
});

test("isRed is true for hearts and diamonds", () => {
  expect(SUITS.filter(isRed)).toEqual(["♥", "♦"]);
});
