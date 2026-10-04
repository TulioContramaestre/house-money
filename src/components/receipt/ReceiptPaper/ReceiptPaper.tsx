import { fmt } from "@/lib/money/format";
import type { ReceiptData } from "@/lib/receipt/summary";
import { formatClock, formatDateTime } from "@/lib/timing/clock";
import { cx } from "../../cx";
import { LogEntry } from "../../log/LogEntry";
import { ReceiptByGame } from "../ReceiptByGame";
import { ReceiptSummary } from "../ReceiptSummary";
import styles from "./ReceiptPaper.module.css";

export function ReceiptPaper({ data }: { readonly data: ReceiptData }) {
  return (
    <article className={styles.receipt}>
      <header className={styles.head}>
        <div className={styles.brand}>House Money</div>
        <p>Cash-out receipt</p>
        <p>
          {formatDateTime(data.startedAt)} to {formatClock(data.endedAt)}
        </p>
      </header>
      <ReceiptSummary data={data} />
      <ReceiptByGame lines={data.byGame} />
      <h3>Full log, oldest first</h3>
      <ol className={styles.log}>
        {data.entries.map((entry) => (
          <LogEntry key={entry.seq} entry={entry} />
        ))}
      </ol>
      <div className={styles.total}>
        <span>Final total</span>
        <strong>{fmt(data.final)}</strong>
      </div>
      <p className={cx(styles.check, !data.check.ok && styles.bad)}>{data.checkText}</p>
      <p className={styles.foot}>Play money only. Nothing from this session was saved, and it&apos;s gone when you leave this page.</p>
    </article>
  );
}
