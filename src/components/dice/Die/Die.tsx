import { cx } from "../../cx";
import styles from "./Die.module.css";

type Face = 1 | 2 | 3 | 4 | 5 | 6;

const PIPS: Readonly<Record<Face, readonly number[]>> = {
  1: [4],
  2: [0, 8],
  3: [0, 4, 8],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8],
};

const CELLS = [0, 1, 2, 3, 4, 5, 6, 7, 8];

interface DieProps {
  readonly value: Face | null;
  readonly tumbling?: boolean;
}

export function Die({ value, tumbling = false }: DieProps) {
  if (!value) return <div className={cx(styles.die, styles.empty)} />;
  const on = PIPS[value];
  return (
    <div className={cx(styles.die, tumbling && styles.tumble)} role="img" aria-label={String(value)}>
      {CELLS.map((cell) => (
        <i key={cell} className={on.includes(cell) ? styles.on : undefined} />
      ))}
    </div>
  );
}
