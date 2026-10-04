import { fmt } from "@/lib/money/format";
import styles from "./QuickAmounts.module.css";

const AMOUNTS = [100_000, 250_000, 400_000, 1_000_000];

export function QuickAmounts({ onPick }: { readonly onPick: (amount: number) => void }) {
  return (
    <div className={styles.quick} aria-label="Quick amounts">
      {AMOUNTS.map((amount) => (
        <button key={amount} type="button" className={styles.amount} onClick={() => onPick(amount)}>
          {fmt(amount)}
        </button>
      ))}
    </div>
  );
}
