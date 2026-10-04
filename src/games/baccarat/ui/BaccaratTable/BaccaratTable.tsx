"use client";

import { FeltPrint } from "@/components/table/FeltPrint";
import { BetSpot } from "@/components/ui/BetSpot";
import { useFreshAfter } from "@/hooks/useFreshAfter";
import { newestId } from "@/lib/cards/card";
import type { GameUiProps } from "../../../types";
import type { BaccaratAction, BaccaratView } from "../../types";
import { BaccaratSide } from "../BaccaratSide";
import { Road } from "../Road";
import styles from "./BaccaratTable.module.css";

export function BaccaratTable({ view, dispatch }: GameUiProps<BaccaratView, BaccaratAction>) {
  const { player, banker } = view;
  const freshAfter = useFreshAfter(newestId(player.cards, banker.cards));
  return (
    <div className={styles.bac}>
      <div className={styles.hands}>
        <BaccaratSide name="Player" side={player} freshAfter={freshAfter} />
        <BaccaratSide name="Banker" side={banker} freshAfter={freshAfter} />
      </div>
      <div className={styles.three}>
        {view.spots.map((spot) => (
          <BetSpot
            key={spot.spot}
            name={spot.name}
            pay={spot.pay}
            label={`Bet on ${spot.name}, pays ${spot.pay}`}
            stake={spot.stake}
            outcome={spot.outcome}
            won={spot.won}
            onClick={() => dispatch({ type: "bet", spot: spot.spot })}
          />
        ))}
      </div>
      <FeltPrint>Banker wins pay 0.95 to 1. A tie pushes player and banker bets.</FeltPrint>
      <Road marks={view.road} />
    </div>
  );
}
