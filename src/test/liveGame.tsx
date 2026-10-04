import { act, render } from "@testing-library/react";
import type { ComponentType } from "react";
import type { BaseView, GameUiProps } from "@/games/types";
import { useGameView, type ViewSource } from "@/session/hooks";
import { flush } from "./engineHarness";

interface LiveEngine<V, A> extends ViewSource<V> {
  dispatch(action: A): void;
}

/** Renders game UI parts bound to a real engine, the way registry.ui does with the session. */
export function renderLive<V extends BaseView, A>(engine: LiveEngine<V, A>, ...parts: ComponentType<GameUiProps<V, A>>[]) {
  const dispatch = (action: A) => engine.dispatch(action);
  function Live() {
    const view = useGameView(engine);
    return parts.map((Part, i) => <Part key={i} view={view} dispatch={dispatch} />);
  }
  return render(<Live />);
}

export async function settle(action: () => void = () => {}): Promise<void> {
  await act(async () => {
    action();
    await flush();
  });
}
