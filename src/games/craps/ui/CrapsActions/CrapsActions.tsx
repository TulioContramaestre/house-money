import { Button } from "@/components/ui/Button";
import type { GameUiProps } from "../../../types";
import type { CrapsAction, CrapsView } from "../../types";

export function CrapsActions({ view, dispatch }: GameUiProps<CrapsView, CrapsAction>) {
  return (
    <>
      <Button disabled={!view.canUndo} onClick={() => dispatch({ type: "undo" })}>
        Undo
      </Button>
      <Button disabled={!view.canClear} onClick={() => dispatch({ type: "clear" })}>
        Clear
      </Button>
      {view.sameBets && (
        <Button disabled={view.sameBets.disabled} onClick={() => dispatch({ type: "rebet" })}>
          Same bets, roll
        </Button>
      )}
      <Button primary disabled={!view.canRoll} onClick={() => dispatch({ type: "roll" })}>
        Roll
      </Button>
    </>
  );
}
