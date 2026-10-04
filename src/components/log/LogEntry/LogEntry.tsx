import { memo } from "react";
import type { LedgerEntry } from "@/lib/ledger/types";
import { fmt, signed } from "@/lib/money/format";
import { formatTime } from "@/lib/timing/clock";
import { cx } from "../../cx";
import styles from "./LogEntry.module.css";

interface LogEntryProps {
  readonly entry: LedgerEntry;
  readonly fresh?: boolean;
}

function kindOf(entry: LedgerEntry): string | undefined {
  if (entry.type === "buyin") return styles.buyin;
  return entry.net > 0 ? styles.win : entry.net < 0 ? styles.loss : styles.even;
}

export const LogEntry = memo(function LogEntry({ entry, fresh = false }: LogEntryProps) {
  const buyIn = entry.type === "buyin";
  return (
    <li className={cx(styles.entry, kindOf(entry), fresh && styles.fresh)}>
      <div className={styles.head}>
        <b>{entry.game}</b>
        <span>
          #{entry.seq}
          {" "}
          {formatTime(entry.at)}
        </span>
      </div>
      <div className={styles.main}>
        <span>{buyIn ? "Bought in" : `Bet ${fmt(entry.wager)}`}</span>
        <span className={styles.net}>{buyIn ? `+${fmt(entry.net)}` : entry.net === 0 ? "±0" : signed(entry.net)}</span>
      </div>
      {!buyIn && <p className={styles.detail}>{entry.detail}</p>}
      <div className={styles.balance}>Balance {fmt(entry.balance)}</div>
    </li>
  );
});
