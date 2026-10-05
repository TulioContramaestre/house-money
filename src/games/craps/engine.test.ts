import { describe, expect, test } from "vitest";
import { seededRng, type Rng } from "@/lib/random/rng";
import { engineHarness, flush, readOnEveryChange, type HarnessOptions } from "@/test/engineHarness";
import { CrapsEngine } from "./engine";
import type { CrapsSpot, DieFace } from "./types";

async function table(options: HarnessOptions = {}) {
  const dice: number[] = [];
  const queuedDice: Rng = {
    int: () => {
      const face = dice.shift();
      if (face === undefined) throw new Error("No die queued");
      return face - 1;
    },
  };
  const h = await engineHarness((deps) => new CrapsEngine(deps), { rng: queuedDice, ...options });
  const bet = (spot: CrapsSpot, chip?: number) => {
    if (chip) h.setChip(chip);
    h.engine.dispatch({ type: "bet", spot });
  };
  const roll = async (d1: DieFace, d2: DieFace) => {
    dice.push(d1, d2);
    h.engine.dispatch({ type: "roll" });
    await flush();
  };
  const spot = (name: CrapsSpot) => h.engine.getView().spots.find((s) => s.spot === name);
  return { ...h, dice, bet, roll, spot, view: () => h.engine.getView() };
}

describe("the come-out roll", () => {
  test("a natural settles every bet that resolves, in table order", async () => {
    const t = await table();
    expect(t.view().message).toBe("Come-out roll. Bet the pass line or don't pass, then roll.");
    t.bet("pass");
    t.bet("dontPass");
    t.bet("field");
    t.bet("any7", 1000);
    expect(t.view().message).toBe("Any 7 1,000. Roll when ready.");
    await t.roll(3, 4);
    expect(t.lastEntry()).toMatchObject({
      game: "Craps",
      wager: 16_000,
      net: -1000,
      detail: "Rolled 7 (3 and 4). A natural. Pass wins. Field −5,000, Any 7 +4,000, Pass line +5,000, Don't pass −5,000.",
    });
    expect(t.view()).toMatchObject({ message: "Rolled 7. A natural. Pass wins. You lose 1,000.", dice: [3, 4], sum: 7, history: [7], point: null });
    expect(t.view().spots.map((s) => [s.spot, s.stake, s.outcome])).toEqual([
      ["pass", 0, 5000],
      ["dontPass", 0, -5000],
      ["odds", 0, null],
      ["field", 0, -5000],
      ["any7", 0, 4000],
      ["anyCraps", 0, null],
    ]);
    expect(t.ledger.reserved).toBe(0);
  });

  test("craps 2 pays don't pass, field double and any craps", async () => {
    const t = await table();
    t.bet("pass");
    t.bet("dontPass");
    t.bet("field", 1000);
    t.bet("anyCraps");
    await t.roll(1, 1);
    expect(t.lastEntry()?.detail).toBe(
      "Rolled 2 (1 and 1). Craps. Don't pass wins. Field +2,000, Any craps +7,000, Pass line −5,000, Don't pass +5,000.",
    );
    expect(t.view().message).toBe("Rolled 2. Craps. Don't pass wins. You win 9,000.");
  });

  test("12 is barred: don't pass stays up and nothing is logged on its own", async () => {
    const t = await table();
    t.bet("dontPass");
    await t.roll(6, 6);
    expect(t.ledger.entries()).toHaveLength(1);
    expect(t.view().message).toBe("Rolled 12. Craps. Don't pass pushes and stays up.");
    expect(t.spot("dontPass")).toMatchObject({ stake: 5000, outcome: null });
    t.bet("pass");
    t.bet("field", 1000);
    await t.roll(6, 6);
    expect(t.lastEntry()?.detail).toBe("Rolled 12 (6 and 6). Craps. Don't pass pushes and stays up. Field +3,000, Pass line −5,000.");
  });

  test("12 without don't pass is plain craps", async () => {
    const t = await table();
    t.bet("pass");
    await t.roll(6, 6);
    expect(t.view().message).toBe("Rolled 12. Craps. You lose 5,000.");
  });
});

describe("with a point", () => {
  async function pointSix() {
    const t = await table();
    t.bet("pass");
    await t.roll(2, 4);
    return t;
  }

  test("setting the point logs nothing and locks the line bet", async () => {
    const t = await pointSix();
    expect(t.ledger.entries()).toHaveLength(1);
    expect(t.view()).toMatchObject({ point: 6, message: "Rolled 6. The point is 6. Roll again.", canLeave: false });
    expect(t.engine.lockMessage()).toBe("Your line bet stays up until the 6 is rolled or a 7 comes. Keep rolling.");
    t.bet("pass");
    expect(t.view().message).toBe("Line bets go down on the come-out roll, before a point is set.");
    expect(t.spot("pass")).toMatchObject({ stake: 5000, closed: false });
    expect(t.spot("dontPass")).toMatchObject({ closed: true });
    expect(t.spot("odds")).toMatchObject({ closed: false, pay: "6 to 5 on 6, up to 5×" });
  });

  test("odds go up to 5× on six and pay 6:5 when the point is made", async () => {
    const t = await pointSix();
    t.bet("odds", 25_000);
    expect(t.view().message).toBe("Odds 25,000. Roll when ready.");
    t.bet("odds", 1000);
    expect(t.view().message).toBe("Odds max is 25,000, 5× your pass line.");
    await t.roll(3, 3);
    expect(t.lastEntry()).toMatchObject({
      wager: 30_000,
      net: 35_000,
      detail: "Rolled 6 (3 and 3). Point made. Pass wins. Pass line +5,000, Odds +30,000.",
    });
    expect(t.view()).toMatchObject({ message: "Rolled 6. Point made. Pass wins. You win 35,000.", point: null, canLeave: true });
  });

  test("seven out", async () => {
    const t = await table();
    t.bet("pass");
    t.bet("dontPass");
    await t.roll(4, 5);
    t.bet("odds");
    await t.roll(1, 6);
    expect(t.lastEntry()?.detail).toBe(
      "Rolled 7 (1 and 6). Seven out. Don't pass wins. Pass line −5,000, Odds −5,000, Don't pass +5,000.",
    );
    expect(t.view().message).toBe("Rolled 7. Seven out. Don't pass wins. You lose 5,000.");
  });

  test("odds need a point and a pass line", async () => {
    const t = await table();
    t.bet("odds");
    expect(t.view().message).toBe("Odds open once a point is set.");
    t.bet("dontPass");
    await t.roll(1, 3);
    t.bet("odds");
    expect(t.view().message).toBe("Odds sit behind a pass line bet.");
  });

  test("other numbers keep rolling", async () => {
    const t = await pointSix();
    t.bet("field", 1000);
    await t.roll(1, 3);
    expect(t.lastEntry()?.detail).toBe("Rolled 4 (1 and 3). The point is still 6. Field +1,000.");
    expect(t.view().message).toBe("Rolled 4. The point is still 6. You win 1,000.");
    expect(t.spot("field")?.stake).toBe(0);
  });
});

describe("clear, undo and same bets", () => {
  test("clear takes down only what can come down", async () => {
    const t = await table();
    t.engine.dispatch({ type: "clear" });
    expect(t.view().message).toBe("No bets to clear.");
    t.bet("pass");
    await t.roll(2, 4);
    t.bet("field", 1000);
    t.bet("odds", 5000);
    t.engine.dispatch({ type: "clear" });
    expect(t.view().message).toBe("Cleared what can come down. Your line bet stays up.");
    expect(t.ledger.reserved).toBe(5000);
    t.engine.dispatch({ type: "clear" });
    expect(t.view().message).toBe("Line bets can't come down once a point is set.");
  });

  test("clear on the come-out takes everything", async () => {
    const t = await table();
    t.bet("pass");
    t.bet("field");
    t.engine.dispatch({ type: "clear" });
    expect(t.view().message).toBe("Bets cleared.");
    expect(t.ledger.reserved).toBe(0);
  });

  test("undo only reaches bets placed since the last roll", async () => {
    const t = await table();
    t.bet("pass");
    await t.roll(2, 4);
    const before = t.view();
    t.engine.dispatch({ type: "undo" });
    expect(t.view()).toBe(before);
    t.bet("field");
    t.engine.dispatch({ type: "undo" });
    expect(t.view().message).toBe("5,000 on the table.");
    expect(t.ledger.reserved).toBe(5000);
  });

  test("undo of the only bet says no bets are down", async () => {
    const t = await table();
    t.bet("field");
    t.engine.dispatch({ type: "undo" });
    expect(t.view().message).toBe("No bets down.");
  });

  test("Same bets, roll re-places what is still allowed", async () => {
    const t = await table();
    t.bet("pass");
    t.bet("field", 1000);
    await t.roll(2, 4);
    expect(t.view().sameBets).toEqual({ disabled: false });
    t.dice.push(1, 3);
    t.engine.dispatch({ type: "rebet" });
    await flush();
    expect(t.lastEntry()?.detail).toBe("Rolled 4 (1 and 3). The point is still 6. Field +1,000.");
    expect(t.spot("pass")?.stake).toBe(5000);
  });

  test("needs a bet to roll", async () => {
    const t = await table();
    t.engine.dispatch({ type: "roll" });
    expect(t.view().message).toBe("Place a bet to roll. Start with the pass line.");
  });
});

describe("dice", () => {
  test("tumble 7 frames, 70 ms apart, before settling", async () => {
    const t = await table({ reducedMotion: false });
    t.bet("field");
    t.dice.push(...Array.from({ length: 14 }, () => 5));
    t.dice.push(3, 4);
    t.engine.dispatch({ type: "roll" });
    expect(t.view()).toMatchObject({ tumbling: true, sum: null, busy: true, message: "Rolling…" });
    await flush();
    expect(t.pauses).toEqual([70, 70, 70, 70, 70, 70, 70]);
    expect(t.view()).toMatchObject({ tumbling: false, dice: [3, 4], sum: 7 });
  });

  test("history keeps the last 18 rolls, newest first", async () => {
    const t = await table({ rng: seededRng(5), chip: 1000 });
    for (let i = 0; i < 20; i++) {
      t.bet("field");
      t.engine.dispatch({ type: "roll" });
      await flush();
    }
    const view = t.view();
    expect(view.history).toHaveLength(18);
    expect(view.history[0]).toBe(view.sum);
  });
});

describe("leaving", () => {
  test("on the come-out, returns every bet and goes back to the opening prompt", async () => {
    const t = await table();
    readOnEveryChange(t.engine);
    t.bet("pass");
    t.bet("field", 1000);
    t.engine.leave();
    expect(t.ledger.reserved).toBe(0);
    expect(t.view().spots.map((s) => s.stake)).toEqual([0, 0, 0, 0, 0, 0]);
    expect(t.view()).toMatchObject({
      canUndo: false,
      canClear: false,
      canRoll: false,
      message: "Come-out roll. Bet the pass line or don't pass, then roll.",
    });
  });

  test("with the point on and only one-roll bets, says no bets are down", async () => {
    const t = await table();
    readOnEveryChange(t.engine);
    t.bet("field");
    await t.roll(2, 4);
    t.bet("field", 1000);
    expect(t.engine.canLeave()).toBe(true);
    t.engine.leave();
    expect(t.ledger.reserved).toBe(0);
    expect(t.spot("field")?.stake).toBe(0);
    expect(t.view()).toMatchObject({ point: 6, canClear: false, message: "No bets down." });
  });
});
