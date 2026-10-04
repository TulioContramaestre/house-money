import { Button } from "@/components/ui/Button";
import { fmt } from "@/lib/money/format";
import type { GameUiProps } from "../../../types";
import type { BlackjackAction, BlackjackView } from "../../types";

export function BlackjackActions({ view, dispatch }: GameUiProps<BlackjackView, BlackjackAction>) {
  if (!view.betting) {
    return (
      <>
        <Button disabled={!view.canAct} onClick={() => dispatch({ type: "hit" })}>
          Hit
        </Button>
        <Button disabled={!view.canAct} onClick={() => dispatch({ type: "stand" })}>
          Stand
        </Button>
        <Button disabled={!view.canDouble} onClick={() => dispatch({ type: "double" })}>
          Double
        </Button>
        <Button disabled={!view.canSplit} onClick={() => dispatch({ type: "split" })}>
          Split
        </Button>
      </>
    );
  }
  const { rebet } = view;
  return (
    <>
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
