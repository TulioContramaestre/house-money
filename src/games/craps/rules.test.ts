import { describe, expect, test } from "vitest";
import {
  ODDS_MAX,
  POINTS,
  allowed,
  fieldPayout,
  noBets,
  oddsPayout,
  payText,
  removableSpots,
  resolveRoll,
  rollDetail,
} from "./rules";
import type { CrapsBets, DieFace, PointNumber } from "./types";

const bets = (partial: Partial<CrapsBets>): CrapsBets => ({ ...noBets(), ...partial });

describe("one-roll bets", () => {
  test("field pays 1:1 on 3, 4, 9, 10, 11, double on 2, triple on 12", () => {
    const pays = Array.from({ length: 11 }, (_, i) => fieldPayout(1000, i + 2));
    expect(pays).toEqual([2000, 1000, 1000, -1000, -1000, -1000, -1000, 1000, 1000, 1000, 3000]);
  });

  test("any 7 pays 4:1 and any craps 7:1", () => {
    const seven = resolveRoll(bets({ any7: 1000, anyCraps: 1000 }), null, 3, 4);
    expect(seven.resolved).toEqual([
      { spot: "any7", wager: 1000, net: 4000 },
      { spot: "anyCraps", wager: 1000, net: -1000 },
    ]);
    const twelve = resolveRoll(bets({ any7: 1000, anyCraps: 1000 }), null, 6, 6);
    expect(twelve.resolved.map((r) => r.net)).toEqual([-1000, 7000]);
  });
});

describe("line bets", () => {
  test("come-out 7 or 11 is a natural", () => {
    for (const [d1, d2] of [[3, 4], [5, 6]] as const) {
      const roll = resolveRoll(bets({ pass: 1000, dontPass: 1000 }), null, d1, d2);
      expect(roll).toMatchObject({ note: "A natural. Pass wins.", point: null });
      expect(roll.resolved.map((r) => [r.spot, r.net])).toEqual([["pass", 1000], ["dontPass", -1000]]);
    }
  });

  test("come-out 2 or 3 is craps for the pass line", () => {
    const roll = resolveRoll(bets({ pass: 1000, dontPass: 1000 }), null, 1, 2);
    expect(roll.note).toBe("Craps. Don't pass wins.");
    expect(roll.resolved.map((r) => [r.spot, r.net])).toEqual([["pass", -1000], ["dontPass", 1000]]);
  });

  test("come-out 12 is barred: don't pass pushes and stays up", () => {
    const roll = resolveRoll(bets({ pass: 1000, dontPass: 1000 }), null, 6, 6);
    expect(roll.note).toBe("Craps. Don't pass pushes and stays up.");
    expect(roll.resolved).toEqual([{ spot: "pass", wager: 1000, net: -1000 }]);
    expect(resolveRoll(bets({ pass: 1000 }), null, 6, 6).note).toBe("Craps.");
  });

  test("come-out 4, 5, 6, 8, 9 or 10 sets the point", () => {
    const rolls: [PointNumber, DieFace, DieFace][] = [[4, 1, 3], [5, 1, 4], [6, 2, 4], [8, 2, 6], [9, 3, 6], [10, 4, 6]];
    for (const [point, d1, d2] of rolls) {
      expect(resolveRoll(bets({ pass: 1000 }), null, d1, d2)).toEqual({ resolved: [], note: `The point is ${point}.`, point });
    }
  });

  test("making the point pays pass and odds and loses don't pass", () => {
    const roll = resolveRoll(bets({ pass: 1000, odds: 5000, dontPass: 1000 }), 6, 3, 3);
    expect(roll).toMatchObject({ note: "Point made. Pass wins.", point: null });
    expect(roll.resolved.map((r) => [r.spot, r.net])).toEqual([["pass", 1000], ["odds", 6000], ["dontPass", -1000]]);
  });

  test("seven out loses pass and odds and pays don't pass", () => {
    const roll = resolveRoll(bets({ pass: 1000, odds: 5000, dontPass: 1000 }), 6, 3, 4);
    expect(roll).toMatchObject({ note: "Seven out. Don't pass wins.", point: null });
    expect(roll.resolved.map((r) => [r.spot, r.net])).toEqual([["pass", -1000], ["odds", -5000], ["dontPass", 1000]]);
  });

  test("anything else leaves the point on", () => {
    expect(resolveRoll(bets({ pass: 1000 }), 6, 4, 4)).toEqual({ resolved: [], note: "The point is still 6.", point: 6 });
  });
});

describe("odds", () => {
  test("pay true odds: 2:1 on 4 and 10, 3:2 on 5 and 9, 6:5 on 6 and 8", () => {
    const points: PointNumber[] = [4, 10, 5, 9, 6, 8];
    expect(points.map((p) => oddsPayout(10_000, p))).toEqual([
      20_000, 20_000, 15_000, 15_000, 12_000, 12_000,
    ]);
  });

  test("3-4-5× maximum odds always pay six times the pass line", () => {
    for (const point of POINTS) expect(oddsPayout(1000 * ODDS_MAX[point], point)).toBe(6000);
  });

  test("describes the odds payout once a point is on", () => {
    expect(payText("odds", null)).toBe("True odds behind the pass line");
    expect(payText("odds", 6)).toBe("6 to 5 on 6, up to 5×");
    expect(payText("odds", 4)).toBe("2 to 1 on 4, up to 3×");
    expect(payText("field", null)).toBe("1 to 1, 2 pays double, 12 triple");
  });
});

describe("what can be bet and taken down", () => {
  test("line bets only on the come-out", () => {
    expect(allowed("pass", 1000, noBets(), null)).toBe(true);
    expect(allowed("dontPass", 1000, noBets(), 6)).toBe("Line bets go down on the come-out roll, before a point is set.");
  });

  test("odds need a point and a pass line bet, up to the multiple", () => {
    expect(allowed("odds", 1000, bets({ pass: 1000 }), null)).toBe("Odds open once a point is set.");
    expect(allowed("odds", 1000, bets({ dontPass: 1000 }), 4)).toBe("Odds sit behind a pass line bet.");
    expect(allowed("odds", 3000, bets({ pass: 1000 }), 4)).toBe(true);
    expect(allowed("odds", 1000, bets({ pass: 1000, odds: 3000 }), 4)).toBe("Odds max is 3,000, 3× your pass line.");
    expect(allowed("odds", 5000, bets({ pass: 1000 }), 8)).toBe(true);
  });

  test("one-roll bets are always open", () => {
    for (const spot of ["field", "any7", "anyCraps"] as const) expect(allowed(spot, 1000, noBets(), 6)).toBe(true);
  });

  test("line bets stay up once a point is set", () => {
    expect(removableSpots(null)).toContain("pass");
    expect(removableSpots(6)).toEqual(["odds", "field", "any7", "anyCraps"]);
  });
});

test("log detail lists resolved bets in order", () => {
  const roll = resolveRoll(bets({ pass: 5000, dontPass: 5000, field: 5000, any7: 1000 }), null, 3, 4);
  expect(rollDetail(3, 4, roll)).toBe(
    "Rolled 7 (3 and 4). A natural. Pass wins. Field −5,000, Any 7 +4,000, Pass line +5,000, Don't pass −5,000.",
  );
});
