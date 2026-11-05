import { describe, expect, test, vi } from "vitest";
import { seededRng } from "@/lib/random/rng";
import { flush } from "@/test/engineHarness";
import { IDLE_STATE, createSession, type Session, type SessionOptions } from "./session";

function make(options: SessionOptions = {}): Session {
  return createSession({ rng: seededRng(7), pause: () => Promise.resolve(), reducedMotion: () => true, ...options });
}

async function opened(amount = 100_000, options: SessionOptions = {}): Promise<Session> {
  const s = make(options);
  await s.open(amount);
  return s;
}

async function handInPlay(s: Session): Promise<void> {
  for (let i = 0; i < 50; i++) {
    s.dispatch("blackjack", { type: "bet" });
    s.dispatch("blackjack", { type: "deal" });
    await flush();
    if (s.engine("blackjack").getView().phase === "play") return;
  }
  throw new Error("Never got a hand in play");
}

const never = () => new Promise<void>(() => {});

describe("opening", () => {
  test("starts idle with nothing on the books", () => {
    const s = make();
    expect(s.getState()).toBe(IDLE_STATE);
    expect(s.getLedgerSnapshot()).toMatchObject({ cash: 0, onTable: 0, balance: 0, buyIn: 0, net: 0, entries: [] });
    expect(s.getChipState().selected).toBe(5000);
    expect(s.getChipState().chips.every((c) => c.disabled)).toBe(true);
  });

  test("goes through opening to open and records the buy-in", async () => {
    const s = make();
    const pending = s.open(400_000);
    expect(s.getState().status).toBe("opening");
    expect(await s.open(400_000)).toBe(false);
    expect(await pending).toBe(true);
    expect(s.getState().status).toBe("open");
    expect(s.getLedgerSnapshot()).toMatchObject({ cash: 400_000, onTable: 0, balance: 400_000, buyIn: 400_000, net: 0 });
    expect(s.getLedgerSnapshot().entries).toHaveLength(1);
  });

  test("re-checks the amount instead of trusting the form", async () => {
    const s = make();
    for (const amount of [500, 1500, 2_000_000_000, NaN]) expect(await s.open(amount)).toBe(false);
    expect(s.getState().status).toBe("idle");
  });
});

describe("chips", () => {
  test("selects rack values the player can afford", async () => {
    const s = await opened(30_000);
    s.selectChip(25_000);
    expect(s.getState().chip).toBe(25_000);
    s.selectChip(2000);
    s.selectChip(100_000);
    expect(s.getState().chip).toBe(25_000);
    expect(s.getChipState().chips.map((c) => [c.value, c.disabled])).toEqual([
      [1000, false],
      [5000, false],
      [25_000, false],
      [100_000, true],
      [500_000, true],
      [1_000_000, true],
    ]);
  });

  test("drops to the largest affordable chip when cash runs short", async () => {
    const s = await opened(1000);
    expect(s.getState().chip).toBe(1000);

    const t = await opened(30_000);
    t.selectChip(25_000);
    t.dispatch("blackjack", { type: "bet" });
    expect(t.getState().chip).toBe(5000);
    t.dispatch("blackjack", { type: "bet" });
    expect(t.getLedgerSnapshot().cash).toBe(0);
    expect(t.getState().chip).toBe(5000);
  });

  test("keeps the chip state stable between changes", async () => {
    const s = await opened();
    expect(s.getChipState()).toBe(s.getChipState());
    s.selectChip(1000);
    expect(s.getChipState().selected).toBe(1000);
  });

  test("is broke once cash can't cover the smallest chip and nothing is on the table", async () => {
    for (let seed = 1; seed < 200; seed++) {
      const s = await opened(2000, { rng: seededRng(seed) });
      s.requestSwitch("baccarat");
      s.selectChip(1000);
      while (s.getLedgerSnapshot().cash >= 1000) {
        s.dispatch("baccarat", { type: "bet", spot: "banker" });
        expect(s.getLedgerSnapshot().broke).toBe(false);
        s.dispatch("baccarat", { type: "deal" });
        await flush();
      }
      const { cash, onTable, broke } = s.getLedgerSnapshot();
      if (cash === 0) continue;
      expect(cash).toBeLessThan(1000);
      expect(onTable).toBe(0);
      expect(broke).toBe(true);
      return;
    }
    throw new Error("Never landed on a balance below the smallest chip");
  });
});

describe("dispatch", () => {
  test("only reaches the active game while the session is open", async () => {
    const s = make();
    s.dispatch("blackjack", { type: "bet" });
    await s.open(100_000);
    s.dispatch("baccarat", { type: "bet", spot: "player" });
    expect(s.getLedgerSnapshot().onTable).toBe(0);
    s.dispatch("blackjack", { type: "bet" });
    expect(s.getLedgerSnapshot()).toMatchObject({ cash: 95_000, onTable: 5000 });
  });

  test("snapshots are frozen and stable until the ledger moves", async () => {
    const s = await opened();
    const before = s.getLedgerSnapshot();
    expect(Object.isFrozen(before)).toBe(true);
    expect(Object.isFrozen(before.entries)).toBe(true);
    expect(s.getLedgerSnapshot()).toBe(before);
    s.dispatch("blackjack", { type: "bet" });
    expect(s.getLedgerSnapshot()).not.toBe(before);
  });

  test("notifies state, ledger and chip subscribers", async () => {
    const s = await opened();
    const state = vi.fn();
    const ledger = vi.fn();
    const chips = vi.fn();
    s.subscribe(state);
    s.subscribeLedger(ledger);
    s.subscribeChips(chips);
    s.selectChip(1000);
    expect(state).toHaveBeenCalled();
    expect(chips).toHaveBeenCalledTimes(1);
    s.dispatch("blackjack", { type: "bet" });
    expect(ledger).toHaveBeenCalled();
    expect(chips).toHaveBeenCalledTimes(2);
  });
});

describe("switching games", () => {
  test("leaves the current game, returning unplayed chips", async () => {
    const s = await opened();
    s.dispatch("blackjack", { type: "bet" });
    expect(s.requestSwitch("roulette")).toBe("switched");
    expect(s.getState().activeGame).toBe("roulette");
    expect(s.getLedgerSnapshot().onTable).toBe(0);
    expect(s.requestSwitch("roulette")).toBe("ignored");
  });

  test("is ignored silently while the game is busy", async () => {
    const s = await opened(100_000, { pause: never, reducedMotion: () => false });
    s.dispatch("blackjack", { type: "bet" });
    s.dispatch("blackjack", { type: "deal" });
    expect(s.requestSwitch("craps")).toBe("ignored");
    expect(s.engine("blackjack").getView().message).toBe("Dealing…");
    expect(s.activate("craps")).toEqual({ ok: false, activeGame: "blackjack" });
  });

  test("shows the lock message mid-round and stays put", async () => {
    const s = await opened();
    await handInPlay(s);
    expect(s.requestSwitch("craps")).toBe("locked");
    expect(s.engine("blackjack").getView().message).toBe("Finish this hand first.");
    expect(s.getState().activeGame).toBe("blackjack");
  });

  test("activate follows the URL unless the game is locked", async () => {
    const s = await opened();
    expect(s.activate("blackjack")).toEqual({ ok: true });
    await handInPlay(s);
    expect(s.activate("baccarat")).toEqual({ ok: false, activeGame: "blackjack" });
    s.dispatch("blackjack", { type: "stand" });
    await flush();
    while (s.engine("blackjack").getView().phase === "play") {
      s.dispatch("blackjack", { type: "stand" });
      await flush();
    }
    expect(s.activate("baccarat")).toEqual({ ok: true });
    expect(s.getState().activeGame).toBe("baccarat");
  });
});

describe("cashing out", () => {
  test("asks only when the current game can be left", async () => {
    const s = await opened();
    expect(s.requestCashOut()).toBe(true);
    await handInPlay(s);
    expect(s.requestCashOut()).toBe(false);
    expect(s.engine("blackjack").getView().message).toBe("Finish this hand first.");
    expect(await s.confirmCashOut()).toBe(false);
    expect(s.getState().status).toBe("open");
  });

  test("is ignored while the game is busy", async () => {
    const s = await opened(100_000, { pause: never, reducedMotion: () => false });
    s.dispatch("blackjack", { type: "bet" });
    s.dispatch("blackjack", { type: "deal" });
    expect(s.requestCashOut()).toBe(false);
    expect(s.engine("blackjack").getView().message).toBe("Dealing…");
  });

  test("returns unplayed chips, verifies the ledger and builds the receipt", async () => {
    const s = await opened(100_000);
    s.dispatch("blackjack", { type: "bet" });
    s.requestSwitch("roulette");
    s.dispatch("roulette", { type: "bet", key: "red" });
    s.dispatch("roulette", { type: "spin" });
    await flush();
    s.dispatch("roulette", { type: "bet", key: "black" });
    expect(s.getLedgerSnapshot().onTable).toBe(5000);

    expect(await s.confirmCashOut()).toBe(true);
    expect(s.getState().status).toBe("closed");
    const receipt = s.getReceipt();
    const snapshot = s.getLedgerSnapshot();
    expect(snapshot.onTable).toBe(0);
    expect(receipt?.data).toMatchObject({ buyIn: 100_000, final: snapshot.balance, rounds: 1 });
    expect(receipt?.data.check).toEqual({ ok: true, sealed: true, count: 2 });
    expect(receipt?.data.checkText).toBe("Ledger check passed: 2 entries replayed, every balance and seal matches.");
    expect(receipt?.text.split("\n")[0]).toBe("HOUSE MONEY - CASH-OUT RECEIPT");
  });

  test("everything stops once the session is closed", async () => {
    const s = await opened();
    await s.confirmCashOut();
    const before = s.getState();
    s.selectChip(1000);
    s.dispatch("blackjack", { type: "bet" });
    expect(s.requestSwitch("craps")).toBe("ignored");
    expect(s.requestCashOut()).toBe(false);
    expect(await s.open(5000)).toBe(false);
    expect(await s.confirmCashOut()).toBe(false);
    expect(s.getState()).toBe(before);
    expect(s.getLedgerSnapshot().onTable).toBe(0);
  });
});
