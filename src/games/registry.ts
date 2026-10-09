import { BaccaratEngine } from "./baccarat/engine";
import { BACCARAT_NAME } from "./baccarat/rules";
import { BlackjackEngine } from "./blackjack/engine";
import { BLACKJACK_NAME } from "./blackjack/rules";
import { CrapsEngine } from "./craps/engine";
import { CRAPS_NAME } from "./craps/rules";
import { RouletteEngine } from "./roulette/engine";
import { ROULETTE_NAME } from "./roulette/rules";
import type { EngineDeps, GameEngine } from "./types";

export const GAMES = [
  { id: "blackjack", name: BLACKJACK_NAME, createEngine: (deps: EngineDeps) => new BlackjackEngine(deps) },
  { id: "baccarat", name: BACCARAT_NAME, createEngine: (deps: EngineDeps) => new BaccaratEngine(deps) },
  { id: "roulette", name: ROULETTE_NAME, createEngine: (deps: EngineDeps) => new RouletteEngine(deps) },
  { id: "craps", name: CRAPS_NAME, createEngine: (deps: EngineDeps) => new CrapsEngine(deps) },
] as const;

export type GameEntry = (typeof GAMES)[number];
export type GameId = GameEntry["id"];
export type EngineOf<K extends GameId> = ReturnType<Extract<GameEntry, { id: K }>["createEngine"]>;
export type ViewOf<K extends GameId> = ReturnType<EngineOf<K>["getView"]>;
export type ActionOf<K extends GameId> = Parameters<EngineOf<K>["dispatch"]>[0];
export type EngineSet = { readonly [K in GameId]: EngineOf<K> };

export const GAME_IDS: readonly GameId[] = GAMES.map((game) => game.id);
export const DEFAULT_GAME: GameId = "blackjack";

export function gameName(id: GameId): string {
  return GAMES.find((game) => game.id === id)?.name ?? id;
}

export function isGameId(value: string): value is GameId {
  return GAMES.some((game) => game.id === value);
}

export function createEngines(deps: EngineDeps): EngineSet {
  const engines: Partial<Record<GameId, GameEngine>> = {};
  for (const game of GAMES) engines[game.id] = game.createEngine(deps);
  // TS can't pair each entry's id with its own engine type inside the loop.
  return engines as EngineSet;
}
