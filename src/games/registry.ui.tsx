"use client";

import type { ComponentType } from "react";
import { useGameView, type ViewSource } from "@/session/hooks";
import { session } from "@/session/session";
import { BaccaratActions } from "./baccarat/ui/BaccaratActions";
import { BaccaratTable } from "./baccarat/ui/BaccaratTable";
import { BlackjackActions } from "./blackjack/ui/BlackjackActions";
import { BlackjackTable } from "./blackjack/ui/BlackjackTable";
import { CrapsActions } from "./craps/ui/CrapsActions";
import { CrapsTable } from "./craps/ui/CrapsTable";
import type { ActionOf, GameId, ViewOf } from "./registry";
import { RouletteActions } from "./roulette/ui/RouletteActions";
import { RouletteTable } from "./roulette/ui/RouletteTable";
import type { GameUiProps } from "./types";

export interface GameUi {
  readonly Table: ComponentType;
  readonly Actions: ComponentType;
}

type Part<K extends GameId> = ComponentType<GameUiProps<ViewOf<K>, ActionOf<K>>>;

function connect<K extends GameId>(id: K, Table: Part<K>, Actions: Part<K>): GameUi {
  const dispatch = (action: ActionOf<K>) => session.dispatch(id, action);
  const bind = (Part: Part<K>) =>
    function Connected() {
      // TS can't tie EngineOf<K> to ViewOf<K> for a generic K; every call below passes a literal id.
      const view = useGameView(session.engine(id) as ViewSource<ViewOf<K>>);
      return <Part view={view} dispatch={dispatch} />;
    };
  return { Table: bind(Table), Actions: bind(Actions) };
}

export const GAME_UI = {
  blackjack: connect("blackjack", BlackjackTable, BlackjackActions),
  baccarat: connect("baccarat", BaccaratTable, BaccaratActions),
  roulette: connect("roulette", RouletteTable, RouletteActions),
  craps: connect("craps", CrapsTable, CrapsActions),
} satisfies Record<GameId, GameUi>;
