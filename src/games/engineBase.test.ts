import { describe, expect, test, vi } from "vitest";
import { EngineBase } from "./engineBase";
import type { BaseView } from "./types";

interface CounterView extends BaseView {
  readonly count: number;
}

type CounterAction = { readonly type: "add" };

class Counter extends EngineBase<CounterView, CounterAction> {
  readonly id = "counter";
  readonly name = "Counter";
  builds = 0;
  #count = 0;

  dispatch(action: CounterAction): void {
    if (action.type === "add") {
      this.#count++;
      this.say(`Count ${this.#count}.`);
    }
  }
  isBusy() {
    return false;
  }
  canLeave() {
    return true;
  }
  lockMessage() {
    return "";
  }
  leave() {}
  protected buildView(): CounterView {
    this.builds++;
    return { message: this.msg, busy: false, canLeave: true, count: this.#count };
  }
}

function setup() {
  let ledgerListener: (() => void) | undefined;
  const engine = new Counter(
    {
      subscribe: (listener) => {
        ledgerListener = listener;
        return () => {};
      },
    },
    "Start.",
  );
  return { engine, ledgerChanged: () => ledgerListener?.() };
}

describe("EngineBase", () => {
  test("caches the view until something changes", () => {
    const { engine } = setup();
    const first = engine.getView();
    expect(engine.getView()).toBe(first);
    expect(engine.builds).toBe(1);
    engine.dispatch({ type: "add" });
    const second = engine.getView();
    expect(second).not.toBe(first);
    expect(second).toMatchObject({ count: 1, message: "Count 1." });
  });

  test("freezes the view it hands out", () => {
    const { engine } = setup();
    expect(Object.isFrozen(engine.getView())).toBe(true);
  });

  test("notifies subscribers and stops after unsubscribe", () => {
    const { engine } = setup();
    const listener = vi.fn();
    const unsubscribe = engine.subscribe(listener);
    engine.dispatch({ type: "add" });
    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
    engine.dispatch({ type: "add" });
    expect(listener).toHaveBeenCalledTimes(1);
  });

  test("rebuilds the view when the ledger changes", () => {
    const { engine, ledgerChanged } = setup();
    const listener = vi.fn();
    engine.subscribe(listener);
    const before = engine.getView();
    ledgerChanged();
    expect(listener).toHaveBeenCalledTimes(1);
    expect(engine.getView()).not.toBe(before);
  });

  test("announce replaces the message", () => {
    const { engine } = setup();
    engine.announce("Finish this hand first.");
    expect(engine.getView().message).toBe("Finish this hand first.");
  });

  test("subscribe and getView work when detached from the engine", () => {
    const { engine } = setup();
    const { subscribe, getView } = engine;
    const listener = vi.fn();
    subscribe(listener);
    engine.dispatch({ type: "add" });
    expect(listener).toHaveBeenCalled();
    expect(getView().count).toBe(1);
  });
});
