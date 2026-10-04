import { describe, expect, test } from "vitest";
import { fmt, short, signed } from "./format";

describe("fmt", () => {
  test("groups thousands with commas", () => {
    expect(fmt(0)).toBe("0");
    expect(fmt(999)).toBe("999");
    expect(fmt(1000)).toBe("1,000");
    expect(fmt(1234567)).toBe("1,234,567");
    expect(fmt(1_000_000_000)).toBe("1,000,000,000");
  });
});

describe("signed", () => {
  test("uses a plus sign, a true minus sign or a bare zero", () => {
    expect(signed(5000)).toBe("+5,000");
    expect(signed(-5000)).toBe("−5,000");
    expect(signed(-5000).charCodeAt(0)).toBe(0x2212);
    expect(signed(0)).toBe("0");
  });
});

describe("short", () => {
  test.each([
    [0, "0"],
    [999, "999"],
    [1000, "1K"],
    [2500, "2.5K"],
    [5000, "5K"],
    [12345, "12.3K"],
    [25000, "25K"],
    [100000, "100K"],
    [500000, "500K"],
    [999000, "999K"],
    [1000000, "1M"],
    [1500000, "1.5M"],
    [1234567, "1.23M"],
    [10000000, "10M"],
  ])("%d → %s", (n, expected) => {
    expect(short(n)).toBe(expected);
  });
});
