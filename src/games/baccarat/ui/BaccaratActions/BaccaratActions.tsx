import { Button } from "@/components/ui/Button";
import { fmt } from "@/lib/money/format";
import type { GameUiProps } from "../../../types";
import type { BaccaratAction, BaccaratView } from "../../types";

export function BaccaratActions({ view, dispatch }: GameUiProps<BaccaratView, BaccaratAction>) {
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
          Deal {fmt(rebet.amount)} again
        </Button>
      ) : (
        <Button primary disabled={!view.canDeal} onClick={() => dispatch({ type: "deal" })}>
          Deal
        </Button>
      )}
    </>
  );
}
