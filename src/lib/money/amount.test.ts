import { describe, expect, test } from "vitest";
import { checkAmount, parseAmount } from "./amount";

describe("parseAmount", () => {
  test.each([
    ["400000", 400000],
    ["400,000", 400000],
    [" $1,000 ", 1000],
    ["1_000", 1000],
    ["2 500 000", 2500000],
    ["400k", 400000],
    ["400K", 400000],
    ["1.5m", 1500000],
    ["1.5M", 1500000],
    ["0.0015m", 1500],
    ["2.25k", 2250],
    ["1.5k", 1500],
    ["999", 999],
  ])("%j → %d", (raw, expected) => {
    expect(parseAmount(raw)).toBe(expected);
  });

  test.each(["", "   ", "abc", "-5000", "1e3", "1.2.3", "5kk", "k", ".5k", "1,5m x", "1b"])("%j → NaN", (raw) => {
    expect(parseAmount(raw)).toBeNaN();
  });
});

describe("checkAmount", () => {
  test("accepts whole thousands from 1,000 to 1,000,000,000", () => {
    for (const v of [1000, 5000, 400000, 1_000_000_000]) expect(checkAmount(v)).toBe("");
  });

  test("asks for an amount when nothing parses", () => {
    expect(checkAmount(NaN)).toBe("Enter an amount in whole thousands, like 400,000.");
  });

  test("enforces the minimum", () => {
    expect(checkAmount(999)).toBe("The smallest buy-in is 1,000.");
    expect(checkAmount(0)).toBe("The smallest buy-in is 1,000.");
  });

  test("enforces the maximum", () => {
    expect(checkAmount(1_000_001_000)).toBe("The largest buy-in is 1,000,000,000.");
  });

  test("suggests the nearest whole thousands", () => {
    expect(checkAmount(1500)).toBe("Use whole thousands: 1,000 or 2,000 would work.");
    expect(checkAmount(400_250)).toBe("Use whole thousands: 400,000 or 401,000 would work.");
  });
});
