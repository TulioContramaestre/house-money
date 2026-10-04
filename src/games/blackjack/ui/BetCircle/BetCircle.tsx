"use client";

import { StakeMarker } from "@/components/ui/StakeMarker";
import { fmt, short } from "@/lib/money/format";
import { useChip } from "@/session/hooks";
import styles from "./BetCircle.module.css";

interface BetCircleProps {
  readonly bet: number;
  readonly onBet: () => void;
}

export function BetCircle({ bet, onBet }: BetCircleProps) {
  const { selected } = useChip();
  return (
    <button type="button" className={styles.betspot} aria-label={`Add a ${fmt(selected)} chip to your bet`} onClick={onBet}>
      {bet ? <StakeMarker amount={bet} size="large" /> : <span className={styles.name}>Bet</span>}
      <small>{bet ? fmt(bet) : `Tap to add ${short(selected)}`}</small>
    </button>
  );
}
