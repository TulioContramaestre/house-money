import { Die } from "@/components/dice/Die";
import type { CrapsView } from "../../types";
import styles from "./DiceRow.module.css";

type DiceRowProps = Pick<CrapsView, "dice" | "tumbling" | "sum" | "history">;

export function DiceRow({ dice: [first, second], tumbling, sum, history }: DiceRowProps) {
  return (
    <div className={styles.row}>
      <Die value={first} tumbling={tumbling} />
      <Die value={second} tumbling={tumbling} />
      <span className={styles.sum}>{sum ?? ""}</span>
      <ol className={styles.history} aria-label="Recent rolls">
        {history.map((roll, i) => (
          <li key={i} className={roll === 7 ? styles.seven : undefined}>
            {roll}
          </li>
        ))}
      </ol>
    </div>
  );
}
