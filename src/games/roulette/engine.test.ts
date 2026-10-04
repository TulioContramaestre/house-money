import { describe, expect, test } from "vitest";
import { seededRng } from "@/lib/random/rng";
import { engineHarness, flush, type HarnessOptions } from "@/test/engineHarness";
import { scriptedRng } from "@/test/scriptedRng";
import { RouletteEngine } from "./engine";
import type { RouletteAction, RouletteBetKey } from "./types";

async function table(results: readonly number[], options: HarnessOptions = {}) {
  const h = await engineHarness((deps) => new RouletteEngine(deps), { rng: scriptedRng(results), ...options });
  const bet = (key: RouletteBetKey, chip?: number) => {
    if (chip) h.setChip(chip);
    h.engine.dispatch({ type: "bet", key });
  };
  const spin = async () => {
    h.engine.dispatch({ type: "spin" });
    await flush();
  };
  return { ...h, bet, spin, view: () => h.engine.getView() };
}

const never = () => new Promise<void>(() => {});

describe("betting", () => {
  test("reports each bet and the layout total", async () => {
    const t = await table([]);
    expect(t.view().message).toBe("Place chips on the layout, then spin.");
    t.bet("n17");
    expect(t.view().message).toBe("5,000 on 17. 5,000 on the layout.");
    t.bet("red");
    expect(t.view().message).toBe("5,000 on red. 10,000 on the layout.");
    t.bet("n17");
    expect(t.view().message).toBe("10,000 on 17. 15,000 on the layout.");
    expect(t.view().cells).toEqual({ n17: { amount: 10_000, paid: false }, red: { amount: 5000, paid: false } });
  });

  test("undo and clear", async () => {
    const t = await table([]);
    t.bet("n17");
    t.bet("red");
    t.engine.dispatch({ type: "undo" });
    expect(t.view().message).toBe("5,000 on the layout.");
    expect(t.view().cells.red).toBeUndefined();
    t.engine.dispatch({ type: "undo" });
    expect(t.view().message).toBe("No bets down.");
    t.bet("odd");
    t.engine.dispatch({ type: "clear" });
    expect(t.view().message).toBe("Bets cleared.");
    expect(t.ledger.reserved).toBe(0);
  });

  test("ignores keys that aren't on the layout", async () => {
    const t = await table([]);
    t.engine.dispatch({ type: "bet", key: "n37" } as unknown as RouletteAction);
    expect(t.ledger.reserved).toBe(0);
  });

  test("needs a bet to spin", async () => {
    const t = await table([]);
    await t.spin();
    expect(t.view().message).toBe("Place a bet first: pick a chip, then tap the layout.");
  });
});

describe("spinning with reduced motion", () => {
  test("settles straight away and pays straight up 35:1", async () => {
    const t = await table([17]);
    t.bet("n17");
    t.bet("red");
    await t.spin();
    expect(t.lastEntry()).toMatchObject({
      game: "Roulette",
      wager: 10_000,
      net: 170_000,
      detail: "Landed 17 black. Paid: 17. Lost: red.",
    });
    expect(t.view()).toMatchObject({
      message: "17 black. You win 170,000.",
      phase: "betting",
      result: { n: 17, color: "black" },
      history: [{ n: 17, color: "black" }],
      stripIndex: 45,
      spinTarget: null,
      hit: "n17",
      cells: { n17: { amount: 5000, paid: true } },
      rebet: { amount: 10_000, disabled: false },
    });
  });

  test("zero loses outside bets", async () => {
    const t = await table([0]);
    t.bet("red");
    t.bet("d1");
    await t.spin();
    expect(t.lastEntry()?.detail).toBe("Landed 0 green. Lost: red, 1st 12.");
    expect(t.view().message).toBe("0 green. You lose 10,000.");
    expect(t.view().cells).toEqual({});
  });
});

describe("the spin protocol", () => {
  test("rides the strip to the target and settles on transitionend", async () => {
    const t = await table([17], { reducedMotion: false, pause: never });
    t.bet("n17");
    t.engine.dispatch({ type: "spin" });
    expect(t.view()).toMatchObject({
      phase: "spinning",
      busy: true,
      canLeave: false,
      message: "No more bets.",
      stripIndex: 37,
      spinTarget: 4 * 37 + 8,
      cells: { n17: { amount: 5000, paid: false } },
      result: null,
    });
    t.bet("red");
    expect(t.ledger.reserved).toBe(5000);
    t.engine.dispatch({ type: "spinSettled" });
    await flush();
    expect(t.view()).toMatchObject({ phase: "betting", stripIndex: 45, spinTarget: null, result: { n: 17 } });
    expect(t.pauses).toEqual([4200]);
  });

  test("settles on its own after 4200 ms", async () => {
    const t = await table([3], { reducedMotion: false });
    t.bet("red");
    await t.spin();
    expect(t.pauses).toEqual([4200]);
    expect(t.view()).toMatchObject({ message: "3 red. You win 5,000.", spinTarget: null });
  });

  test("ignores a stray spinSettled", async () => {
    const t = await table([]);
    const before = t.view();
    t.engine.dispatch({ type: "spinSettled" });
    expect(t.view()).toBe(before);
  });
});

describe("after the spin", () => {
  test("new chips clear the old result off the felt but keep the ball", async () => {
    const t = await table([17]);
    t.bet("n17");
    await t.spin();
    t.bet("n5");
    expect(t.view()).toMatchObject({ cells: { n5: { amount: 5000, paid: false } }, hit: null, result: { n: 17 }, rebet: null });
  });

  test("Spin again re-places the same bets and spins", async () => {
    const t = await table([17, 3]);
    t.bet("n17");
    t.bet("red");
    await t.spin();
    t.engine.dispatch({ type: "rebet" });
    await flush();
    expect(t.lastEntry()).toMatchObject({ seq: 3, wager: 10_000, net: 0, detail: "Landed 3 red. Paid: red. Lost: 17." });
    expect(t.view().message).toBe("3 red. You break even.");
    expect(t.view().history).toEqual([
      { n: 3, color: "red" },
      { n: 17, color: "black" },
    ]);
  });

  test("explains when the rebet can't be covered", async () => {
    const t = await table([0], { buyIn: 10_000 });
    t.bet("red");
    t.bet("black");
    await t.spin();
    expect(t.view().rebet).toEqual({ amount: 10_000, disabled: true });
    t.engine.dispatch({ type: "rebet" });
    expect(t.view().message).toBe("You need 10,000 in cash to repeat those bets.");
  });

  test("history keeps the last 16 numbers, newest first", async () => {
    const t = await table([], { rng: seededRng(11), chip: 1000 });
    for (let i = 0; i < 20; i++) {
      t.bet("red");
      await t.spin();
    }
    const history = t.view().history;
    expect(history).toHaveLength(16);
    expect(history[0]).toEqual(t.view().result);
  });
});

describe("locks and leaving", () => {
  test("locks while the ball is moving and releases unplayed chips on leave", async () => {
    const t = await table([17], { reducedMotion: false, pause: never });
    t.bet("n17");
    t.engine.dispatch({ type: "spin" });
    expect(t.engine.canLeave()).toBe(false);
    expect(t.engine.lockMessage()).toBe("Wait for the ball to land.");
    t.engine.dispatch({ type: "spinSettled" });
    await flush();
    t.bet("red");
    t.engine.leave();
    expect(t.ledger.reserved).toBe(0);
  });
});
