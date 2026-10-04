import { describe, expect, test } from "vitest";
import { SAMPLE_BUY_IN, SAMPLE_FINAL, SAMPLE_SESSION, entry } from "@/test/entries";
import { buildReceipt, checkText } from "./summary";

const passed = { ok: true, sealed: true, count: 5 } as const;

describe("buildReceipt", () => {
  const receipt = buildReceipt({
    entries: SAMPLE_SESSION,
    buyIn: SAMPLE_BUY_IN,
    final: SAMPLE_FINAL,
    startedAt: 1,
    endedAt: 2,
    check: passed,
  });

  test("summarises the money", () => {
    expect(receipt).toMatchObject({ buyIn: 100_000, final: 99_500, net: -500, startedAt: 1, endedAt: 2 });
  });

  test("counts rounds, results and the total wagered", () => {
    expect(receipt).toMatchObject({ rounds: 4, won: 2, lost: 1, pushed: 1, wagered: 22_000 });
  });

  test("finds the biggest win and loss", () => {
    expect(receipt.best).toEqual({ net: 7500, game: "Blackjack" });
    expect(receipt.worst).toEqual({ net: -10_000, game: "Roulette" });
  });

  test("groups by game in order of first appearance", () => {
    expect(receipt.byGame).toEqual([
      { game: "Blackjack", rounds: 2, net: 7500 },
      { game: "Roulette", rounds: 1, net: -10_000 },
      { game: "Craps", rounds: 1, net: 2000 },
    ]);
  });

  test("keeps the full log oldest first with the check line", () => {
    expect(receipt.entries.map((e) => e.seq)).toEqual([1, 2, 3, 4, 5]);
    expect(receipt.checkText).toBe("Ledger check passed: 5 entries replayed, every balance and seal matches.");
  });

  test("keeps the first of tied highlights", () => {
    const tied = buildReceipt({
      entries: [
        SAMPLE_SESSION[0] ?? entry({ seq: 1 }),
        entry({ seq: 2, game: "Craps", net: 5000, balance: 105_000 }),
        entry({ seq: 3, game: "Baccarat", net: 5000, balance: 110_000 }),
      ],
      buyIn: SAMPLE_BUY_IN,
      final: 110_000,
      startedAt: 1,
      endedAt: 2,
      check: passed,
    });
    expect(tied.best).toEqual({ net: 5000, game: "Craps" });
    expect(tied.worst).toBeNull();
  });

  test("handles a session with no rounds", () => {
    const empty = buildReceipt({
      entries: SAMPLE_SESSION.slice(0, 1),
      buyIn: SAMPLE_BUY_IN,
      final: SAMPLE_BUY_IN,
      startedAt: 1,
      endedAt: 2,
      check: { ok: true, sealed: true, count: 1 },
    });
    expect(empty).toMatchObject({ rounds: 0, won: 0, lost: 0, pushed: 0, wagered: 0, net: 0, best: null, worst: null, byGame: [] });
  });
});

describe("checkText", () => {
  test("names seals when the chain was sealed", () => {
    expect(checkText({ ok: true, sealed: true, count: 12 })).toBe(
      "Ledger check passed: 12 entries replayed, every balance and seal matches.",
    );
  });

  test("says balances only when it couldn't seal", () => {
    expect(checkText({ ok: true, sealed: false, count: 3 })).toBe("Ledger check passed: 3 entries replayed and every balance matches.");
  });

  test("warns when the check fails", () => {
    expect(checkText({ ok: false, sealed: true, count: 3 })).toBe(
      "Ledger check failed: the log was changed after it was written. Treat these numbers as unreliable.",
    );
  });
});
