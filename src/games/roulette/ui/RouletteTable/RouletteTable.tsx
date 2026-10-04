import { FeltPrint } from "@/components/table/FeltPrint";
import type { GameUiProps } from "../../../types";
import type { RouletteAction, RouletteView } from "../../types";
import { Board } from "../Board";
import { ResultHistory } from "../ResultHistory";
import { WheelStrip } from "../WheelStrip";
import styles from "./RouletteTable.module.css";

export function RouletteTable({ view, dispatch }: GameUiProps<RouletteView, RouletteAction>) {
  return (
    <div className={styles.rl}>
      <WheelStrip
        stripIndex={view.stripIndex}
        spinTarget={view.spinTarget}
        onSettled={() => dispatch({ type: "spinSettled" })}
      />
      <ResultHistory result={view.result} history={view.history} />
      <Board cells={view.cells} hit={view.hit} onBet={(key) => dispatch({ type: "bet", key })} />
      <FeltPrint>Single zero. Straight up pays 35 to 1. Dozens and columns pay 2 to 1.</FeltPrint>
    </div>
  );
}
