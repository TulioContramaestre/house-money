import { cx } from "@/components/cx";
import type { PointNumber } from "../../types";
import styles from "./PointTrack.module.css";

const BOXES: readonly (readonly [PointNumber, string])[] = [
  [4, "4"],
  [5, "5"],
  [6, "Six"],
  [8, "8"],
  [9, "Nine"],
  [10, "10"],
];

export function PointTrack({ point }: { readonly point: PointNumber | null }) {
  return (
    <div className={styles.points}>
      <span className={cx(styles.puck, styles.off, point !== null && styles.away)}>Off</span>
      {BOXES.map(([n, label]) => (
        <div key={n} className={cx(styles.box, point === n && styles.isPoint)}>
          {label}
          {point === n && <span className={cx(styles.puck, styles.on)}>On</span>}
        </div>
      ))}
    </div>
  );
}
