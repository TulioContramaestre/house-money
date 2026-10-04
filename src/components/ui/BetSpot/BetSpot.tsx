import type { ReactNode } from "react";
import { cx } from "../../cx";
import { OutcomeBadge } from "../OutcomeBadge";
import { StakeMarker } from "../StakeMarker";
import styles from "./BetSpot.module.css";

interface BetSpotProps {
  readonly name: string;
  readonly pay: string;
  readonly label: string;
  readonly stake: number;
  readonly outcome?: number | null;
  readonly won?: boolean;
  readonly closed?: boolean;
  readonly extra?: ReactNode;
  readonly onClick: () => void;
}

export function BetSpot({ name, pay, label, stake, outcome = null, won = false, closed = false, extra, onClick }: BetSpotProps) {
  return (
    <button
      type="button"
      className={cx(styles.spot, closed && styles.closed, won && styles.won)}
      aria-label={label}
      onClick={onClick}
    >
      <span className={styles.name}>{name}</span>
      <span className={styles.pay}>{pay}</span>
      {extra}
      <span className={styles.foot}>
        <StakeMarker amount={stake} />
        {outcome !== null && <OutcomeBadge net={outcome} />}
      </span>
    </button>
  );
}
