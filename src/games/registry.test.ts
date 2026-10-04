import { expect, test } from "vitest";
import { engineHarness } from "@/test/engineHarness";
import { DEFAULT_GAME, GAMES, GAME_IDS, createEngines, isGameId } from "./registry";

test("lists the games in tab order", () => {
  expect(GAME_IDS).toEqual(["blackjack", "baccarat", "roulette", "craps"]);
  expect(GAMES.map((g) => g.name)).toEqual(["Blackjack", "Baccarat", "Roulette", "Craps"]);
  expect(DEFAULT_GAME).toBe("blackjack");
});

test("each entry builds an engine with its own id and ledger name", async () => {
  const { engine: engines } = await engineHarness(createEngines);
  for (const game of GAMES) {
    expect(engines[game.id].id).toBe(game.id);
    expect(engines[game.id].name).toBe(game.name);
  }
});

test("isGameId only accepts registered ids", () => {
  expect(isGameId("craps")).toBe(true);
  expect(isGameId("poker")).toBe(false);
  expect(isGameId("toString")).toBe(false);
});
