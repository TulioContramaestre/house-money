import { describe, expect, test } from "vitest";
import {
  NUMBERS,
  OUTSIDE_NAMES,
  WHEEL,
  betName,
  colorOf,
  isRouletteBetKey,
  multiplier,
  restIndex,
  spinTargetIndex,
  straightKey,
} from "./rules";
import type { OutsideKey, RouletteBetKey, RouletteNumber } from "./types";

const ALL_KEYS: readonly RouletteBetKey[] = [
  ...NUMBERS.map(straightKey),
  ...(Object.keys(OUTSIDE_NAMES) as OutsideKey[]),
];

describe("payouts", () => {
  test("every bet has an expected value of exactly −1/37", () => {
    for (const key of ALL_KEYS) {
      const units = NUMBERS.reduce<number>((sum, n) => sum + multiplier(key, n), 0);
      expect(units, key).toBe(-1);
    }
  });

  test("straight up pays 35:1, dozens and columns 2:1, the rest 1:1", () => {
    expect(multiplier("n17", 17)).toBe(35);
    expect(multiplier("n0", 0)).toBe(35);
    expect(multiplier("n17", 18)).toBe(-1);
    expect(multiplier("d2", 17)).toBe(2);
    expect(multiplier("c2", 17)).toBe(2);
    expect(multiplier("c3", 36)).toBe(2);
    expect(multiplier("black", 17)).toBe(1);
    expect(multiplier("odd", 17)).toBe(1);
    expect(multiplier("low", 17)).toBe(1);
    expect(multiplier("high", 17)).toBe(-1);
    expect(multiplier("red", 17)).toBe(-1);
  });

  test("zero loses every outside bet", () => {
    for (const key of Object.keys(OUTSIDE_NAMES) as OutsideKey[]) expect(multiplier(key, 0)).toBe(-1);
  });
});

describe("colors and names", () => {
  test("18 red, 18 black and a green zero", () => {
    const colors = NUMBERS.map(colorOf);
    expect(colors.filter((c) => c === "red")).toHaveLength(18);
    expect(colors.filter((c) => c === "black")).toHaveLength(18);
    expect(colorOf(0)).toBe("green");
    const reds: RouletteNumber[] = [1, 3, 12, 19, 36];
    const blacks: RouletteNumber[] = [2, 10, 11, 17, 28];
    expect(reds.map(colorOf)).toEqual(["red", "red", "red", "red", "red"]);
    expect(blacks.map(colorOf)).toEqual(["black", "black", "black", "black", "black"]);
  });

  test("names bets the way the log does", () => {
    expect(betName("n17")).toBe("17");
    expect(betName("low")).toBe("1–18");
    expect(betName("d1")).toBe("1st 12");
    expect(betName("c3")).toBe("column 3");
  });

  test("accepts only real bet keys", () => {
    for (const key of ALL_KEYS) expect(isRouletteBetKey(key)).toBe(true);
    for (const key of ["n37", "n01", "n-1", "n", "green", "toString", "__proto__", ""]) expect(isRouletteBetKey(key)).toBe(false);
  });
});

describe("wheel strip", () => {
  test("the wheel holds each number once", () => {
    expect(new Set(WHEEL).size).toBe(37);
    expect(WHEEL[0]).toBe(0);
  });

  test("rests on the first repeat and spins to the fifth", () => {
    expect(restIndex(0)).toBe(37);
    expect(restIndex(17)).toBe(37 + 8);
    expect(spinTargetIndex(17)).toBe(4 * 37 + 8);
  });
});
