import { describe, expect, test } from "vitest";
import { CHIPS, DEFAULT_CHIP, chipClass, isChipValue, largestAffordableChip } from "./chips";
import { isStake, isWhole } from "./stake";

describe("chips", () => {
  test("rack is 1K, 5K, 25K, 100K, 500K and 1M, defaulting to 5K", () => {
    expect(CHIPS.map((c) => c.value)).toEqual([1000, 5000, 25000, 100000, 500000, 1000000]);
    expect(DEFAULT_CHIP).toBe(5000);
  });

  test("chipClass picks the largest denomination at or below the amount", () => {
    expect(chipClass(1000)).toBe("c1");
    expect(chipClass(4000)).toBe("c1");
    expect(chipClass(5000)).toBe("c5");
    expect(chipClass(30000)).toBe("c25");
    expect(chipClass(100000)).toBe("c100");
    expect(chipClass(750000)).toBe("c500");
    expect(chipClass(1000000)).toBe("c1m");
    expect(chipClass(7000000)).toBe("c1m");
  });

  test("isChipValue only accepts rack values", () => {
    expect(isChipValue(25000)).toBe(true);
    expect(isChipValue(2000)).toBe(false);
  });

  test("largestAffordableChip finds the biggest chip that fits", () => {
    expect(largestAffordableChip(0)).toBeNull();
    expect(largestAffordableChip(999)).toBeNull();
    expect(largestAffordableChip(1000)).toBe(1000);
    expect(largestAffordableChip(24000)).toBe(5000);
    expect(largestAffordableChip(5_000_000)).toBe(1000000);
  });
});

describe("stake", () => {
  test("isStake accepts positive whole thousands only", () => {
    expect(isStake(1000)).toBe(true);
    expect(isStake(25000)).toBe(true);
    for (const v of [0, -1000, 1500, 999, 1000.5, NaN, Infinity, "1000", null, undefined]) expect(isStake(v)).toBe(false);
  });

  test("isWhole accepts integers, including negatives and zero", () => {
    for (const v of [0, -7500, 1500, 1e9]) expect(isWhole(v)).toBe(true);
    for (const v of [0.5, NaN, Infinity, -Infinity, "3"]) expect(isWhole(v)).toBe(false);
  });
});
