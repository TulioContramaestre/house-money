import { afterEach, describe, expect, test, vi } from "vitest";
import { Ledger } from "./ledger";

async function openLedger(buyIn = 100_000) {
  const onChange = vi.fn();
  const ledger = new Ledger(onChange);
  await ledger.open(buyIn);
  onChange.mockClear();
  return { ledger, onChange };
}

describe("open", () => {
  test("records the buy-in as the first entry", async () => {
    const { ledger } = await openLedger(400_000);
    expect(ledger.isOpen).toBe(true);
    expect(ledger.balance).toBe(400_000);
    expect(ledger.available).toBe(400_000);
    expect(ledger.buyIn).toBe(400_000);
    expect(ledger.startedAt).toBeGreaterThan(0);
    expect(ledger.entries()).toEqual([
      expect.objectContaining({
        seq: 1,
        type: "buyin",
        game: "Cashier",
        wager: 0,
        net: 400_000,
        balance: 400_000,
        detail: "Chips purchased.",
      }),
    ]);
  });

  test("only takes whole thousands", async () => {
    await expect(new Ledger().open(1500)).rejects.toThrow("Buy-in must be whole thousands");
    await expect(new Ledger().open(0)).rejects.toThrow("Buy-in must be whole thousands");
  });

  test("opens once, even when called twice before the key is ready", async () => {
    const ledger = new Ledger();
    const first = ledger.open(1000);
    await expect(ledger.open(1000)).rejects.toThrow("Session already started");
    await first;
    await expect(ledger.open(1000)).rejects.toThrow("Session already started");
    expect(ledger.entries()).toHaveLength(1);
  });

  test("notifies on open", async () => {
    const onChange = vi.fn();
    await new Ledger(onChange).open(1000);
    expect(onChange).toHaveBeenCalledTimes(1);
  });
});

describe("reserve and release", () => {
  test("move cash on and off the table", async () => {
    const { ledger, onChange } = await openLedger(10_000);
    expect(ledger.reserve(4000)).toBe(true);
    expect(ledger.available).toBe(6000);
    expect(ledger.reserved).toBe(4000);
    expect(ledger.balance).toBe(10_000);
    expect(ledger.release(1000)).toBe(true);
    expect(ledger.available).toBe(7000);
    expect(onChange).toHaveBeenCalledTimes(2);
    expect(ledger.entries()).toHaveLength(1);
  });

  test("reject amounts that aren't positive whole thousands", async () => {
    const { ledger, onChange } = await openLedger();
    for (const amount of [0, -1000, 1500, 999, NaN, Infinity]) expect(ledger.reserve(amount)).toBe(false);
    expect(ledger.reserved).toBe(0);
    expect(onChange).not.toHaveBeenCalled();
  });

  test("reject overbets and over-releases", async () => {
    const { ledger } = await openLedger(10_000);
    expect(ledger.reserve(11_000)).toBe(false);
    expect(ledger.reserve(10_000)).toBe(true);
    expect(ledger.reserve(1000)).toBe(false);
    expect(ledger.release(11_000)).toBe(false);
    expect(ledger.release(1500)).toBe(false);
  });

  test("do nothing before opening or after closing", async () => {
    expect(new Ledger().reserve(1000)).toBe(false);
    const { ledger } = await openLedger();
    ledger.reserve(1000);
    ledger.close();
    expect(ledger.reserve(1000)).toBe(false);
    expect(ledger.release(1000)).toBe(false);
  });
});

describe("settle", () => {
  test("resolves reserved chips into a frozen log entry", async () => {
    const { ledger, onChange } = await openLedger(100_000);
    ledger.reserve(10_000);
    const entry = ledger.settle("Blackjack", 10_000, 15_000, "You: blackjack. Dealer: 19. Win.");
    expect(entry).toEqual({
      seq: 2,
      at: expect.any(Number),
      type: "bet",
      game: "Blackjack",
      wager: 10_000,
      net: 15_000,
      balance: 115_000,
      detail: "You: blackjack. Dealer: 19. Win.",
    });
    expect(Object.isFrozen(entry)).toBe(true);
    expect(() => {
      (entry as { net: number }).net = 1_000_000;
    }).toThrow(TypeError);
    expect(ledger.reserved).toBe(0);
    expect(ledger.balance).toBe(115_000);
    expect(onChange).toHaveBeenCalledTimes(2);
  });

  test("allows losing exactly the wager, and pushes", async () => {
    const { ledger } = await openLedger(10_000);
    ledger.reserve(4000);
    ledger.settle("Roulette", 2000, -2000, "Lost.");
    ledger.settle("Blackjack", 2000, 0, "Push.");
    expect(ledger.balance).toBe(8000);
    expect(ledger.available).toBe(8000);
  });

  test("rejects wagers that aren't on the table", async () => {
    const { ledger } = await openLedger();
    ledger.reserve(5000);
    expect(() => ledger.settle("Craps", 6000, 0, "")).toThrow("Invalid wager");
    expect(() => ledger.settle("Craps", 1500, 0, "")).toThrow("Invalid wager");
    expect(() => ledger.settle("Craps", 0, 0, "")).toThrow("Invalid wager");
  });

  test("rejects impossible results", async () => {
    const { ledger } = await openLedger();
    ledger.reserve(5000);
    expect(() => ledger.settle("Craps", 5000, -6000, "")).toThrow("Invalid result");
    expect(() => ledger.settle("Craps", 5000, 2500.5, "")).toThrow("Invalid result");
    expect(() => ledger.settle("Craps", 5000, NaN, "")).toThrow("Invalid result");
    expect(ledger.reserved).toBe(5000);
    expect(ledger.entries()).toHaveLength(1);
  });

  test("refuses once the session is closed", async () => {
    const { ledger } = await openLedger();
    ledger.reserve(5000);
    ledger.close();
    expect(() => ledger.settle("Craps", 5000, 0, "")).toThrow("Session closed");
  });
});

describe("entries", () => {
  test("returns a copy, oldest first", async () => {
    const { ledger } = await openLedger();
    ledger.reserve(1000);
    ledger.settle("Baccarat", 1000, 950, "Banker wins 7 to 5.");
    const copy = ledger.entries();
    copy.length = 0;
    expect(ledger.entries().map((e) => e.seq)).toEqual([1, 2]);
  });
});

describe("verify", () => {
  test("passes for a clean session and reports the seals", async () => {
    const { ledger } = await openLedger(100_000);
    ledger.reserve(30_000);
    ledger.settle("Blackjack", 10_000, -10_000, "a");
    ledger.settle("Roulette", 10_000, 350_000, "b");
    ledger.settle("Craps", 10_000, 0, "c");
    ledger.close();
    expect(await ledger.verify()).toEqual({ ok: true, sealed: true, count: 4 });
  });

  test("fails while chips are still on the table", async () => {
    const { ledger } = await openLedger();
    ledger.reserve(1000);
    expect((await ledger.verify()).ok).toBe(false);
  });
});

describe("without crypto.subtle", () => {
  afterEach(() => {
    vi.doUnmock("@/lib/security/trusted");
    vi.resetModules();
  });

  test("falls back to arithmetic-only checks", async () => {
    vi.resetModules();
    vi.doMock("@/lib/security/trusted", async (importOriginal) => ({
      ...(await importOriginal<typeof import("@/lib/security/trusted")>()),
      generateKey: null,
      hmacSign: null,
    }));
    const { Ledger: Unsealed } = await import("./ledger");
    const ledger = new Unsealed();
    await ledger.open(5000);
    ledger.reserve(5000);
    ledger.settle("Baccarat", 5000, 4750, "Banker wins.");
    expect(await ledger.verify()).toEqual({ ok: true, sealed: false, count: 2 });
  });
});
