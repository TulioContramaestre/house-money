import { isRed, type Card } from "@/lib/cards/card";
import { cx } from "../../cx";
import styles from "./PlayingCard.module.css";

interface PlayingCardProps {
  readonly card: Card;
  readonly faceDown?: boolean;
  readonly fresh?: boolean;
}

export function PlayingCard({ card, faceDown = false, fresh = false }: PlayingCardProps) {
  if (faceDown) {
    return <div className={cx(styles.card, styles.back, fresh && styles.fresh)} role="img" aria-label="Face-down card" />;
  }
  const index = (
    <>
      {card.r}
      <br />
      {card.s}
    </>
  );
  return (
    <div className={cx(styles.card, isRed(card.s) && styles.red, fresh && styles.fresh)} role="img" aria-label={`${card.r}${card.s}`}>
      <span className={styles.index}>{index}</span>
      <span className={styles.pip}>{card.s}</span>
      <span className={cx(styles.index, styles.indexBottom)}>{index}</span>
    </div>
  );
}
