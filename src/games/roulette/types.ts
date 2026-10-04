import type { BaseView, RebetView } from "../types";

export type RouletteNumber =
  | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18
  | 19 | 20 | 21 | 22 | 23 | 24 | 25 | 26 | 27 | 28 | 29 | 30 | 31 | 32 | 33 | 34 | 35 | 36;
export type StraightKey = `n${RouletteNumber}`;
export type OutsideKey = "low" | "high" | "even" | "odd" | "red" | "black" | "d1" | "d2" | "d3" | "c1" | "c2" | "c3";
export type RouletteBetKey = StraightKey | OutsideKey;
export type RouletteColor = "red" | "black" | "green";

export interface RouletteCellView {
  readonly amount: number;
  readonly paid: boolean;
}

export interface RouletteResult {
  readonly n: RouletteNumber;
  readonly color: RouletteColor;
}

export interface RouletteView extends BaseView {
  readonly phase: "betting" | "spinning";
  readonly stripIndex: number;
  readonly spinTarget: number | null;
  readonly result: RouletteResult | null;
  readonly history: readonly RouletteResult[];
  readonly cells: Readonly<Partial<Record<RouletteBetKey, RouletteCellView>>>;
  readonly hit: StraightKey | null;
  readonly canUndo: boolean;
  readonly canClear: boolean;
  readonly canSpin: boolean;
  readonly rebet: RebetView | null;
}

export type RouletteAction =
  | { readonly type: "bet"; readonly key: RouletteBetKey }
  | { readonly type: "undo" }
  | { readonly type: "clear" }
  | { readonly type: "spin" }
  | { readonly type: "rebet" }
  | { readonly type: "spinSettled" };
