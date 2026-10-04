import type { Card } from "@/lib/cards/card";
import type { BaseView, RebetView } from "../types";

export type BaccaratSpot = "player" | "tie" | "banker";
export type BaccaratPhase = "bet" | "dealing" | "done";
export type RoadMark = "P" | "B" | "T";
export type BaccaratBets = Readonly<Record<BaccaratSpot, number>>;

export interface BaccaratSideView {
  readonly cards: readonly Card[];
  readonly total: number | null;
  readonly won: boolean;
}

export interface BaccaratSpotView {
  readonly spot: BaccaratSpot;
  readonly name: string;
  readonly pay: string;
  readonly stake: number;
  readonly outcome: number | null;
  readonly won: boolean;
}

export interface BaccaratView extends BaseView {
  readonly phase: BaccaratPhase;
  readonly player: BaccaratSideView;
  readonly banker: BaccaratSideView;
  readonly spots: readonly BaccaratSpotView[];
  readonly road: readonly RoadMark[];
  readonly canUndo: boolean;
  readonly canClear: boolean;
  readonly canDeal: boolean;
  readonly rebet: RebetView | null;
}

export type BaccaratAction =
  | { readonly type: "bet"; readonly spot: BaccaratSpot }
  | { readonly type: "undo" }
  | { readonly type: "clear" }
  | { readonly type: "deal" }
  | { readonly type: "rebet" };
