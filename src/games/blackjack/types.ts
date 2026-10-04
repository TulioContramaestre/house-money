import type { Card } from "@/lib/cards/card";
import type { BaseView, RebetView } from "../types";

export type BlackjackPhase = "bet" | "play" | "dealer" | "done";

export type HandResult = "Blackjack" | "Push" | "Lose" | "Bust" | "Win";

export interface HandOutcome {
  readonly net: number;
  readonly label: HandResult;
}

export interface BlackjackHandView {
  readonly cards: readonly Card[];
  readonly label: string;
  readonly bet: number;
  readonly active: boolean;
  readonly outcome: HandOutcome | null;
}

export interface BlackjackDealerView {
  readonly cards: readonly Card[];
  readonly holeHidden: boolean;
  readonly total: string;
}

export interface BlackjackView extends BaseView {
  readonly phase: BlackjackPhase;
  readonly dealer: BlackjackDealerView;
  readonly hands: readonly BlackjackHandView[];
  readonly betting: boolean;
  readonly bet: number;
  readonly canAct: boolean;
  readonly canDouble: boolean;
  readonly canSplit: boolean;
  readonly canClear: boolean;
  readonly canDeal: boolean;
  readonly rebet: RebetView | null;
}

export type BlackjackAction =
  | { readonly type: "bet" }
  | { readonly type: "clear" }
  | { readonly type: "deal" }
  | { readonly type: "rebet" }
  | { readonly type: "hit" }
  | { readonly type: "stand" }
  | { readonly type: "double" }
  | { readonly type: "split" };
