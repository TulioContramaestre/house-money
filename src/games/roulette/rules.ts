import type { OutsideKey, RouletteBetKey, RouletteColor, RouletteNumber, StraightKey } from "./types";

export const ROULETTE_NAME = "Roulette";
export const POCKETS = 37;
export const STRIP_REPEATS = 6;
export const REST = POCKETS;
export const SPIN_LAPS = 4;
export const SPIN_TIMEOUT = 4200;
export const HISTORY_LENGTH = 16;

export const NUMBERS: readonly RouletteNumber[] = [
  0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18,
  19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36,
];

export const WHEEL: readonly RouletteNumber[] = [
  0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28,
  12, 35, 3, 26,
];

const RED_NUMBERS: readonly RouletteNumber[] = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];
const RED: readonly boolean[] = NUMBERS.map((n) => RED_NUMBERS.includes(n));

export const OUTSIDE_NAMES: Readonly<Record<OutsideKey, string>> = {
  low: "1–18",
  high: "19–36",
  even: "even",
  odd: "odd",
  red: "red",
  black: "black",
  d1: "1st 12",
  d2: "2nd 12",
  d3: "3rd 12",
  c1: "column 1",
  c2: "column 2",
  c3: "column 3",
};

export function colorOf(n: RouletteNumber): RouletteColor {
  return n === 0 ? "green" : RED[n] ? "red" : "black";
}

export function straightKey(n: RouletteNumber): StraightKey {
  return `n${n}`;
}

export function isStraightKey(key: RouletteBetKey): key is StraightKey {
  return key[0] === "n";
}

export function isRouletteBetKey(value: string): value is RouletteBetKey {
  return /^n([0-9]|[12][0-9]|3[0-6])$/.test(value) || Object.hasOwn(OUTSIDE_NAMES, value);
}

export function betName(key: RouletteBetKey): string {
  return isStraightKey(key) ? key.slice(1) : OUTSIDE_NAMES[key];
}

function outsideHit(key: OutsideKey, n: RouletteNumber): boolean {
  switch (key) {
    case "red":
      return RED[n] === true;
    case "black":
      return RED[n] === false;
    case "odd":
      return n % 2 === 1;
    case "even":
      return n % 2 === 0;
    case "low":
      return n <= 18;
    case "high":
      return n >= 19;
    case "d1":
      return n <= 12;
    case "d2":
      return n >= 13 && n <= 24;
    case "d3":
      return n >= 25;
    case "c1":
      return n % 3 === 1;
    case "c2":
      return n % 3 === 2;
    case "c3":
      return n % 3 === 0;
  }
}

/** Profit per unit staked, or -1 for a loss. */
export function multiplier(key: RouletteBetKey, n: RouletteNumber): number {
  if (isStraightKey(key)) return key === straightKey(n) ? 35 : -1;
  if (n === 0 || !outsideHit(key, n)) return -1;
  return key[0] === "d" || key[0] === "c" ? 2 : 1;
}

export function wheelIndex(n: RouletteNumber): number {
  return WHEEL.indexOf(n);
}

export function restIndex(n: RouletteNumber): number {
  return REST + wheelIndex(n);
}

export function spinTargetIndex(n: RouletteNumber): number {
  return SPIN_LAPS * POCKETS + wheelIndex(n);
}
