import type { BaseView } from "../types";

export type CrapsSpot = "pass" | "dontPass" | "odds" | "field" | "any7" | "anyCraps";
export type PointNumber = 4 | 5 | 6 | 8 | 9 | 10;
export type DieFace = 1 | 2 | 3 | 4 | 5 | 6;
export type CrapsBets = Readonly<Record<CrapsSpot, number>>;

export interface CrapsSpotView {
  readonly spot: CrapsSpot;
  readonly name: string;
  readonly pay: string;
  readonly stake: number;
  readonly closed: boolean;
  readonly outcome: number | null;
}

export interface CrapsView extends BaseView {
  readonly point: PointNumber | null;
  readonly dice: readonly [DieFace | null, DieFace | null];
  readonly tumbling: boolean;
  readonly sum: number | null;
  readonly history: readonly number[];
  readonly spots: readonly CrapsSpotView[];
  readonly canUndo: boolean;
  readonly canClear: boolean;
  readonly canRoll: boolean;
  readonly sameBets: { readonly disabled: boolean } | null;
}

export type CrapsAction =
  | { readonly type: "bet"; readonly spot: CrapsSpot }
  | { readonly type: "undo" }
  | { readonly type: "clear" }
  | { readonly type: "roll" }
  | { readonly type: "rebet" };
