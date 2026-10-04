import { fmt, signed } from "@/lib/money/format";
import type { CrapsBets, CrapsSpot, DieFace, PointNumber } from "./types";

export const CRAPS_NAME = "Craps";
export const POINTS: readonly PointNumber[] = [4, 5, 6, 8, 9, 10];
export const FACES: readonly DieFace[] = [1, 2, 3, 4, 5, 6];
export const TUMBLE_FRAMES = 7;
export const TUMBLE_PAUSE = 70;
export const HISTORY_LENGTH = 18;

export const ODDS_MAX: Readonly<Record<PointNumber, number>> = { 4: 3, 5: 4, 6: 5, 8: 5, 9: 4, 10: 3 };
export const ODDS_PAY: Readonly<Record<PointNumber, readonly [number, number]>> = {
  4: [2, 1],
  10: [2, 1],
  5: [3, 2],
  9: [3, 2],
  6: [6, 5],
  8: [6, 5],
};

export const SPOT_NAMES: Readonly<Record<CrapsSpot, string>> = {
  pass: "Pass line",
  dontPass: "Don't pass",
  odds: "Odds",
  field: "Field",
  any7: "Any 7",
  anyCraps: "Any craps",
};

export const SPOT_ORDER: readonly CrapsSpot[] = ["pass", "dontPass", "odds", "field", "any7", "anyCraps"];
const REMOVABLE_ON_POINT: readonly CrapsSpot[] = ["odds", "field", "any7", "anyCraps"];

const FIXED_PAY: Readonly<Record<Exclude<CrapsSpot, "odds">, string>> = {
  pass: "1 to 1",
  dontPass: "1 to 1, 12 pushes",
  field: "1 to 1, 2 pays double, 12 triple",
  any7: "4 to 1, one roll",
  anyCraps: "7 to 1, one roll",
};

export function isCrapsSpot(value: string): value is CrapsSpot {
  return Object.hasOwn(SPOT_NAMES, value);
}

export function isPoint(sum: number): sum is PointNumber {
  return sum === 4 || sum === 5 || sum === 6 || sum === 8 || sum === 9 || sum === 10;
}

export function noBets(): Record<CrapsSpot, number> {
  return { pass: 0, dontPass: 0, odds: 0, field: 0, any7: 0, anyCraps: 0 };
}

export function totalStake(bets: CrapsBets): number {
  return bets.pass + bets.dontPass + bets.odds + bets.field + bets.any7 + bets.anyCraps;
}

export function removableSpots(point: PointNumber | null): readonly CrapsSpot[] {
  return point === null ? SPOT_ORDER : REMOVABLE_ON_POINT;
}

export function payText(spot: CrapsSpot, point: PointNumber | null): string {
  if (spot !== "odds") return FIXED_PAY[spot];
  if (point === null) return "True odds behind the pass line";
  const [a, d] = ODDS_PAY[point];
  return `${a} to ${d} on ${point}, up to ${ODDS_MAX[point]}×`;
}

export function allowed(spot: CrapsSpot, amount: number, bets: CrapsBets, point: PointNumber | null): true | string {
  switch (spot) {
    case "pass":
    case "dontPass":
      return point === null || "Line bets go down on the come-out roll, before a point is set.";
    case "odds": {
      if (point === null) return "Odds open once a point is set.";
      if (!bets.pass) return "Odds sit behind a pass line bet.";
      const max = bets.pass * ODDS_MAX[point];
      return bets.odds + amount <= max || `Odds max is ${fmt(max)}, ${ODDS_MAX[point]}× your pass line.`;
    }
    case "field":
    case "any7":
    case "anyCraps":
      return true;
  }
}

export function oddsPayout(odds: number, point: PointNumber): number {
  const [a, d] = ODDS_PAY[point];
  return Math.round((odds * a) / d);
}

export function fieldPayout(field: number, sum: number): number {
  if (sum === 3 || sum === 4 || sum === 9 || sum === 10 || sum === 11) return field;
  if (sum === 2) return field * 2;
  if (sum === 12) return field * 3;
  return -field;
}

export interface Resolution {
  readonly spot: CrapsSpot;
  readonly wager: number;
  readonly net: number;
}

export interface RollResult {
  readonly resolved: readonly Resolution[];
  readonly note: string;
  readonly point: PointNumber | null;
}

export function resolveRoll(bets: CrapsBets, point: PointNumber | null, d1: DieFace, d2: DieFace): RollResult {
  const sum = d1 + d2;
  const resolved: Resolution[] = [];
  const resolve = (spot: CrapsSpot, net: number) => {
    if (bets[spot]) resolved.push({ spot, wager: bets[spot], net });
  };
  resolve("field", fieldPayout(bets.field, sum));
  resolve("any7", sum === 7 ? bets.any7 * 4 : -bets.any7);
  resolve("anyCraps", sum === 2 || sum === 3 || sum === 12 ? bets.anyCraps * 7 : -bets.anyCraps);

  if (point === null) {
    if (sum === 7 || sum === 11) {
      resolve("pass", bets.pass);
      resolve("dontPass", -bets.dontPass);
      return { resolved, note: "A natural. Pass wins.", point: null };
    }
    if (sum === 2 || sum === 3) {
      resolve("pass", -bets.pass);
      resolve("dontPass", bets.dontPass);
      return { resolved, note: "Craps. Don't pass wins.", point: null };
    }
    if (sum === 12) {
      resolve("pass", -bets.pass);
      return { resolved, note: bets.dontPass ? "Craps. Don't pass pushes and stays up." : "Craps.", point: null };
    }
    return { resolved, note: `The point is ${sum}.`, point: isPoint(sum) ? sum : null };
  }
  if (sum === point) {
    resolve("pass", bets.pass);
    resolve("odds", oddsPayout(bets.odds, point));
    resolve("dontPass", -bets.dontPass);
    return { resolved, note: "Point made. Pass wins.", point: null };
  }
  if (sum === 7) {
    resolve("pass", -bets.pass);
    resolve("odds", -bets.odds);
    resolve("dontPass", bets.dontPass);
    return { resolved, note: "Seven out. Don't pass wins.", point: null };
  }
  return { resolved, note: `The point is still ${point}.`, point };
}

export function rollDetail(d1: DieFace, d2: DieFace, roll: RollResult): string {
  const parts = roll.resolved.map((r) => `${SPOT_NAMES[r.spot]} ${signed(r.net)}`).join(", ");
  return `Rolled ${d1 + d2} (${d1} and ${d2}). ${roll.note} ${parts}.`;
}
