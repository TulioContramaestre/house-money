import { cx } from "../../cx";
import styles from "./ReceiptRows.module.css";

export interface ReceiptRow {
  readonly label: string;
  readonly value: string;
  readonly net?: number;
}

export function ReceiptRows({ rows }: { readonly rows: readonly ReceiptRow[] }) {
  return (
    <dl className={styles.rows}>
      {rows.map(({ label, value, net }) => (
        <div
          key={label}
          className={net === undefined ? undefined : cx(styles.net, net > 0 && styles.pos, net < 0 && styles.neg)}
        >
          <dt>{label}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  );
}
