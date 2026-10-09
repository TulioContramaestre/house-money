"use client";

import type { ComponentType } from "react";
import { useGameView, type ViewSource } from "@/session/hooks";
import { session } from "@/session/session";
import { BaccaratActions } from "./baccarat/ui/BaccaratActions";
import { BaccaratRules } from "./baccarat/ui/BaccaratRules";
import { BaccaratTable } from "./baccarat/ui/BaccaratTable";
import { BlackjackActions } from "./blackjack/ui/BlackjackActions";
import { BlackjackRules } from "./blackjack/ui/BlackjackRules";
import { BlackjackTable } from "./blackjack/ui/BlackjackTable";
import { CrapsActions } from "./craps/ui/CrapsActions";
import { CrapsRules } from "./craps/ui/CrapsRules";
import { CrapsTable } from "./craps/ui/CrapsTable";
import type { ActionOf, GameId, ViewOf } from "./registry";
import { RouletteActions } from "./roulette/ui/RouletteActions";
import { RouletteRules } from "./roulette/ui/RouletteRules";
import { RouletteTable } from "./roulette/ui/RouletteTable";
import type { GameUiProps } from "./types";

export interface GameUi {
  readonly Table: ComponentType;
  readonly Actions: ComponentType;
  readonly Rules: ComponentType;
}

type Part<K extends GameId> = ComponentType<GameUiProps<ViewOf<K>, ActionOf<K>>>;

function connect<K extends GameId>(id: K, Table: Part<K>, Actions: Part<K>, Rules: ComponentType): GameUi {
  const dispatch = (action: ActionOf<K>) => session.dispatch(id, action);
  const bind = (Part: Part<K>) =>
    function Connected() {
      // TS can't tie EngineOf<K> to ViewOf<K> for a generic K; every call below passes a literal id.
      const view = useGameView(session.engine(id) as ViewSource<ViewOf<K>>);
      return <Part view={view} dispatch={dispatch} />;
    };
  return { Table: bind(Table), Actions: bind(Actions), Rules };
}

export const GAME_UI = {
  blackjack: connect("blackjack", BlackjackTable, BlackjackActions, BlackjackRules),
  baccarat: connect("baccarat", BaccaratTable, BaccaratActions, BaccaratRules),
  roulette: connect("roulette", RouletteTable, RouletteActions, RouletteRules),
  craps: connect("craps", CrapsTable, CrapsActions, CrapsRules),
} satisfies Record<GameId, GameUi>;
