import { afterEach, describe, expect, test, vi } from "vitest";
import { cryptoRng, seededRng } from "./rng";

describe("cryptoRng", () => {
  test("returns whole numbers in [0, n)", () => {
    for (const n of [1, 2, 6, 37, 52, 416]) {
      for (let i = 0; i < 500; i++) {
        const x = cryptoRng.int(n);
        expect(Number.isInteger(x)).toBe(true);
        expect(x).toBeGreaterThanOrEqual(0);
        expect(x).toBeLessThan(n);
      }
    }
  });

  test("covers every roulette pocket evenly", () => {
    const counts = new Array<number>(37).fill(0);
    for (let i = 0; i < 37 * 2000; i++) {
      const pocket = cryptoRng.int(37);
      counts[pocket] = (counts[pocket] ?? 0) + 1;
    }
    for (const c of counts) {
      expect(c).toBeGreaterThan(1500);
      expect(c).toBeLessThan(2500);
    }
  });

  test("rejects bounds that aren't whole numbers from 1 to 2^32", () => {
    for (const n of [0, -1, 1.5, NaN, Infinity, 4294967297]) expect(() => cryptoRng.int(n)).toThrow(RangeError);
  });
});

describe("cryptoRng rejection sampling", () => {
  afterEach(() => {
    vi.doUnmock("@/lib/security/trusted");
    vi.resetModules();
  });

  test("redraws values at or above the largest multiple of n", async () => {
    const draws = [4294967295, 4294967294, 5];
    vi.resetModules();
    vi.doMock("@/lib/security/trusted", async (importOriginal) => {
      const real = await importOriginal<typeof import("@/lib/security/trusted")>();
      return {
        ...real,
        getRandomValues: (buf: Uint32Array) => {
          buf[0] = draws.shift() ?? 0;
          return buf;
        },
      };
    });
    const { cryptoRng: scripted } = await import("./rng");
    // 2^32 mod 3 = 1, so 4294967295 is the one biased value; 4294967294 % 3 = 2 is fine.
    expect(scripted.int(3)).toBe(2);
    expect(scripted.int(3)).toBe(2);
    expect(draws).toEqual([]);
  });
});

describe("seededRng", () => {
  test("is deterministic per seed", () => {
    const a = seededRng(42);
    const b = seededRng(42);
    const c = seededRng(7);
    const seqA = Array.from({ length: 20 }, () => a.int(1000));
    const seqB = Array.from({ length: 20 }, () => b.int(1000));
    const seqC = Array.from({ length: 20 }, () => c.int(1000));
    expect(seqA).toEqual(seqB);
    expect(seqA).not.toEqual(seqC);
  });

  test("stays in range, including seed 0", () => {
    const rng = seededRng(0);
    for (let i = 0; i < 1000; i++) {
      const x = rng.int(6);
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThan(6);
    }
  });
});
