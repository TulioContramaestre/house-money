"use client";

import { ActionBar } from "@/components/casino/ActionBar";
import { BrokeBanner } from "@/components/casino/BrokeBanner";
import { ChipRack } from "@/components/casino/ChipRack";
import { FeltTable } from "@/components/table/FeltTable";
import { MessageLine } from "@/components/table/MessageLine";
import { useActivateGame } from "@/session/guards";
import { useActiveGame, useActiveView } from "@/session/hooks";
import type { GameId } from "../registry";
import { GAME_UI } from "../registry.ui";
import styles from "./GameStage.module.css";

export function GameStage({ requestedId }: { readonly requestedId: GameId }) {
  useActivateGame(requestedId);
  const { Table, Actions } = GAME_UI[useActiveGame()];
  const { message } = useActiveView();
  return (
    <>
      <MessageLine message={message} />
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
