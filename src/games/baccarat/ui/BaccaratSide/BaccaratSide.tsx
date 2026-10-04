import { CardRow } from "@/components/cards/CardRow";
import { cx } from "@/components/cx";
import { SeatLabel } from "@/components/table/SeatLabel";
import type { BaccaratSideView } from "../../types";
import styles from "./BaccaratSide.module.css";

interface BaccaratSideProps {
  readonly name: string;
  readonly side: BaccaratSideView;
  readonly freshAfter: number;
}

export function BaccaratSide({ name, side, freshAfter }: BaccaratSideProps) {
  return (
    <div className={cx(styles.side, side.won && styles.won)}>
      <SeatLabel name={name} total={side.total} />
      <CardRow cards={side.cards} freshAfter={freshAfter} />
    </div>
  );
}
