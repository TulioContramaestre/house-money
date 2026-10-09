"use client";

import { ActionBar } from "@/components/casino/ActionBar";
import { BrokeBanner } from "@/components/casino/BrokeBanner";
import { ChipRack } from "@/components/casino/ChipRack";
import { FeltTable } from "@/components/table/FeltTable";
import { MessageLine } from "@/components/table/MessageLine";
import { RulesButton } from "@/components/table/RulesButton";
import { useActivateGame } from "@/session/guards";
import { useActiveGame, useActiveView } from "@/session/hooks";
import { gameName, type GameId } from "../registry";
import { GAME_UI } from "../registry.ui";
import styles from "./GameStage.module.css";

export function GameStage({ requestedId }: { readonly requestedId: GameId }) {
  useActivateGame(requestedId);
  const game = useActiveGame();
  const { Table, Actions, Rules } = GAME_UI[game];
  const { message } = useActiveView();
  return (
    <>
      <div className={styles.head}>
        <MessageLine message={message} />
        <RulesButton game={gameName(game)}>
          <Rules />
        </RulesButton>
      </div>
      <FeltTable>
        <BrokeBanner />
        <Table />
      </FeltTable>
      <div className={styles.rack}>
        <ChipRack />
        <ActionBar>
          <Actions />
        </ActionBar>
      </div>
    </>
  );
}
