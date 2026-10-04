import { CardRow } from "@/components/cards/CardRow";
import { cx } from "@/components/cx";
import { TotalPill } from "@/components/table/TotalPill";
import { OutcomeBadge } from "@/components/ui/OutcomeBadge";
import { StakeMarker } from "@/components/ui/StakeMarker";
import type { BlackjackHandView } from "../../types";
import styles from "./Hand.module.css";

interface HandProps {
  readonly hand: BlackjackHandView | null;
  readonly freshAfter: number;
}

export function Hand({ hand, freshAfter }: HandProps) {
  if (!hand) {
    return (
      <div className={styles.hand}>
        <CardRow cards={[]} />
      </div>
    );
  }
  return (
    <div className={cx(styles.hand, hand.active && styles.active)}>
      <CardRow cards={hand.cards} freshAfter={freshAfter} />
      <div className={styles.info}>
        <TotalPill>{hand.label}</TotalPill>
        <StakeMarker amount={hand.bet} />
        {hand.outcome && <OutcomeBadge net={hand.outcome.net} label={hand.outcome.label} />}
      </div>
    </div>
  );
}
