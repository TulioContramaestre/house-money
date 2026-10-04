import { Button } from "@/components/ui/Button";
import { fmt } from "@/lib/money/format";
import type { GameUiProps } from "../../../types";
import type { RouletteAction, RouletteView } from "../../types";

export function RouletteActions({ view, dispatch }: GameUiProps<RouletteView, RouletteAction>) {
  const { rebet } = view;
  return (
    <>
      <Button disabled={!view.canUndo} onClick={() => dispatch({ type: "undo" })}>
        Undo
      </Button>
      <Button disabled={!view.canClear} onClick={() => dispatch({ type: "clear" })}>
        Clear
      </Button>
      {rebet ? (
        <Button primary disabled={rebet.disabled} onClick={() => dispatch({ type: "rebet" })}>
          Spin {fmt(rebet.amount)} again
        </Button>
      ) : (
        <Button primary disabled={!view.canSpin} onClick={() => dispatch({ type: "spin" })}>
          Spin
        </Button>
      )}
    </>
  );
}
