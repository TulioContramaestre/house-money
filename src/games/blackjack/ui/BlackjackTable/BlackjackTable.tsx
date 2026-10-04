"use client";

import { CardRow } from "@/components/cards/CardRow";
import { FeltPrint } from "@/components/table/FeltPrint";
import { SeatLabel } from "@/components/table/SeatLabel";
import { useFreshAfter } from "@/hooks/useFreshAfter";
import { newestId } from "@/lib/cards/card";
import type { GameUiProps } from "../../../types";
import type { BlackjackAction, BlackjackView } from "../../types";
import { BetCircle } from "../BetCircle";
import { Hand } from "../Hand";
import styles from "./BlackjackTable.module.css";

export function BlackjackTable({ view, dispatch }: GameUiProps<BlackjackView, BlackjackAction>) {
  const { dealer, hands } = view;
  const freshAfter = useFreshAfter(newestId(dealer.cards, ...hands.map((hand) => hand.cards)));
  return (
    <div className={styles.bj}>
      <div className={styles.seat}>
        <SeatLabel name="Dealer" total={dealer.total} />
        <CardRow cards={dealer.cards} hidden={dealer.holeHidden ? 1 : null} freshAfter={freshAfter} />
      </div>
      <FeltPrint>
        Blackjack pays 3 to 2
        <br />
        Dealer stands on all 17s
      </FeltPrint>
      <div className={styles.seat}>
        <div className={styles.hands}>
          {hands.length ? (
            hands.map((hand, i) => <Hand key={i} hand={hand} freshAfter={freshAfter} />)
          ) : (
            <Hand hand={null} freshAfter={freshAfter} />
          )}
        </div>
      </div>
      {view.betting && <BetCircle bet={view.bet} onBet={() => dispatch({ type: "bet" })} />}
    </div>
  );
}
