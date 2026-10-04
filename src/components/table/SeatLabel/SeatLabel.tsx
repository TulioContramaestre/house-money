import { TotalPill } from "../TotalPill";
import styles from "./SeatLabel.module.css";

interface SeatLabelProps {
  readonly name: string;
  readonly total: string | number | null;
}

export function SeatLabel({ name, total }: SeatLabelProps) {
  return (
    <div className={styles.label}>
      {name}
      {total !== null && total !== "" && <TotalPill>{total}</TotalPill>}
    </div>
  );
}
