import { cx } from "@/components/cx";
import type { RouletteResult } from "../../types";
import styles from "./ResultHistory.module.css";

interface ResultHistoryProps {
  readonly result: RouletteResult | null;
  readonly history: readonly RouletteResult[];
}

export function ResultHistory({ result, history }: ResultHistoryProps) {
  return (
    <div className={styles.meta}>
      {result ? (
        <span className={cx(styles.ball, styles[result.color])} aria-label={`Last result ${result.n}`}>
          {result.n}
        </span>
      ) : (
        <span className={cx(styles.ball, styles.none)} aria-label="No result yet">
          –
        </span>
      )}
      <ol className={styles.history} aria-label="Recent numbers">
        {history.map((past, i) => (
          <li key={i} className={styles[past.color]}>
            {past.n}
          </li>
        ))}
      </ol>
    </div>
  );
}
