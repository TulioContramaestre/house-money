import { cx } from "@/components/cx";
import type { RoadMark } from "../../types";
import styles from "./Road.module.css";

const TITLES: Readonly<Record<RoadMark, string>> = { P: "Player", B: "Banker", T: "Tie" };

export function Road({ marks }: { readonly marks: readonly RoadMark[] }) {
  return (
    <div className={styles.road} aria-label="Recent results">
      {marks.length > 0 && <span className={styles.label}>Last {marks.length}</span>}
      {marks.map((mark, i) => (
        <span key={i} className={cx(styles.dot, styles[mark])} title={TITLES[mark]}>
          {mark}
        </span>
      ))}
    </div>
  );
}
