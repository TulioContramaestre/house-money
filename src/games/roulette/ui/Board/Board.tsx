import type { CSSProperties } from "react";
import { cx } from "@/components/cx";
import { StakeMarker } from "@/components/ui/StakeMarker";
import { BOARD, type BoardCell } from "../../layout";
import type { RouletteBetKey, RouletteView } from "../../types";
import styles from "./Board.module.css";

interface BoardProps {
  readonly cells: RouletteView["cells"];
  readonly hit: RouletteView["hit"];
  readonly onBet: (key: RouletteBetKey) => void;
}

function CellLabel({ label }: { readonly label: BoardCell["label"] }) {
  if (typeof label === "string") return label;
  return <span className={cx(styles.swatch, styles[label.swatch])} />;
}

export function Board({ cells, hit, onBet }: BoardProps) {
  return (
    <div className={styles.board}>
      {BOARD.map((cell) => {
        const stake = cells[cell.key];
        const style: CSSProperties & { "--h": string; "--v": string } = { "--h": cell.wide, "--v": cell.narrow };
        return (
          <button
            key={cell.key}
            type="button"
            className={cx(
              styles.cell,
              styles[cell.kind],
              cell.side && styles.side,
              cell.color && styles[cell.color],
              stake?.paid && styles.paid,
              hit === cell.key && styles.hit,
            )}
            style={style}
            aria-label={`Bet on ${cell.aria}`}
            onClick={() => onBet(cell.key)}
          >
            <CellLabel label={cell.label} />
            <StakeMarker amount={stake?.amount ?? 0} size="small" className={styles.stake} />
          </button>
        );
      })}
    </div>
  );
}
