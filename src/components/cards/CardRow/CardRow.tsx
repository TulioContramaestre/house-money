import type { Card } from "@/lib/cards/card";
import { cx } from "../../cx";
import { CardSlot } from "../CardSlot";
import { PlayingCard } from "../PlayingCard";
import styles from "./CardRow.module.css";

interface CardRowProps {
  readonly cards: readonly Card[];
  readonly hidden?: number | null;
  readonly freshAfter?: number;
}

export function CardRow({ cards, hidden = null, freshAfter = Infinity }: CardRowProps) {
  if (!cards.length) {
    return (
      <div className={cx(styles.row, styles.slots)}>
        <CardSlot />
        <CardSlot />
      </div>
    );
  }
  return (
    <div className={cx(styles.row, styles.cards)}>
      {cards.map((card, i) => (
        <PlayingCard key={card.id} card={card} faceDown={i === hidden} fresh={card.id > freshAfter} />
      ))}
    </div>
  );
}
