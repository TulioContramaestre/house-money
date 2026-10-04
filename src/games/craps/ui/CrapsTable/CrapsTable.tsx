import { BetSpot } from "@/components/ui/BetSpot";
import type { GameUiProps } from "../../../types";
import type { CrapsAction, CrapsView } from "../../types";
import { DiceRow } from "../DiceRow";
import { PointTrack } from "../PointTrack";
import styles from "./CrapsTable.module.css";

const fieldNumbers = (
  <span className={styles.fieldNums}>
    <b>2</b> 3 4 9 10 11 <b>12</b>
  </span>
);

export function CrapsTable({ view, dispatch }: GameUiProps<CrapsView, CrapsAction>) {
  return (
    <div className={styles.cr}>
      <PointTrack point={view.point} />
      <DiceRow dice={view.dice} tumbling={view.tumbling} sum={view.sum} history={view.history} />
      <div className={styles.grid}>
        {view.spots.map((spot) => (
          <BetSpot
            key={spot.spot}
            name={spot.name}
            pay={spot.pay}
            label={`${spot.name}, pays ${spot.pay}`}
            stake={spot.stake}
            outcome={spot.outcome}
            closed={spot.closed}
            extra={spot.spot === "field" ? fieldNumbers : undefined}
            onClick={() => dispatch({ type: "bet", spot: spot.spot })}
          />
        ))}
      </div>
    </div>
  );
}
