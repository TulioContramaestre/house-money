import { memo, type CSSProperties, type TransitionEvent } from "react";
import { cx } from "@/components/cx";
import { STRIP } from "../../layout";
import styles from "./WheelStrip.module.css";

const Pockets = memo(function Pockets() {
  return STRIP.map((pocket, i) => (
    <span key={i} className={cx(styles.pocket, styles[pocket.color])}>
      {pocket.n}
    </span>
  ));
});

interface WheelStripProps {
  readonly stripIndex: number;
  readonly spinTarget: number | null;
  readonly onSettled: () => void;
}

export function WheelStrip({ stripIndex, spinTarget, onSettled }: WheelStripProps) {
  const style: CSSProperties & { "--i": number } = { "--i": spinTarget ?? stripIndex };
  const settled = (event: TransitionEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) onSettled();
  };
  return (
    <div className={styles.wheel} aria-hidden="true">
      <div className={cx(styles.strip, spinTarget !== null && styles.spinning)} style={style} onTransitionEnd={settled}>
        <Pockets />
      </div>
      <div className={styles.frame} />
    </div>
  );
}
