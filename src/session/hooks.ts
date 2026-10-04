import { useSyncExternalStore } from "react";
import { DEFAULT_GAME, type GameId } from "@/games/registry";
import type { BaseView, GameEngine } from "@/games/types";
import {
  EMPTY_LEDGER,
  IDLE_CHIPS,
  session,
  type ChipState,
  type LedgerSnapshot,
  type SessionReceipt,
  type SessionStatus,
} from "./session";

const noSubscription = () => () => {};

export function useIsClient(): boolean {
  return useSyncExternalStore(
    noSubscription,
    () => true,
    () => false,
  );
}

export function useSessionStatus(): SessionStatus {
  return useSyncExternalStore(
    session.subscribe,
    () => session.getState().status,
    () => "idle",
  );
}

export function useActiveGame(): GameId {
  return useSyncExternalStore(
    session.subscribe,
    () => session.getState().activeGame,
    () => DEFAULT_GAME,
  );
}

export function useLedgerSnapshot(): LedgerSnapshot {
  return useSyncExternalStore(session.subscribeLedger, session.getLedgerSnapshot, () => EMPTY_LEDGER);
}

export function useChip(): ChipState {
  return useSyncExternalStore(session.subscribeChips, session.getChipState, () => IDLE_CHIPS);
}

export function useReceipt(): SessionReceipt | null {
  return useSyncExternalStore(session.subscribe, session.getReceipt, () => null);
}

export interface ViewSource<V> {
  readonly subscribe: (listener: () => void) => () => void;
  readonly getView: () => Readonly<V>;
}

export function useGameView<V extends BaseView>(engine: ViewSource<V>): Readonly<V> {
  return useSyncExternalStore(engine.subscribe, engine.getView, engine.getView);
}

export function useActiveView(): Readonly<BaseView> {
  const engine: GameEngine = session.engine(useActiveGame());
  return useGameView(engine);
}
