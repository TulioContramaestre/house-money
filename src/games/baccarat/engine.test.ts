import { describe, expect, test } from "vitest";
import { seededRng } from "@/lib/random/rng";
import { engineHarness, flush, type HarnessOptions } from "@/test/engineHarness";
import { stackedShoe } from "@/test/stackedShoe";
import { BaccaratEngine } from "./engine";
import type { BaccaratSpot } from "./types";

async function table(cards: string, options: HarnessOptions = {}) {
  const shoe = stackedShoe(cards);
  const h = await engineHarness((deps) => new BaccaratEngine(deps, shoe), options);
  const bet = (spot: BaccaratSpot, chip?: number) => {
    if (chip) h.setChip(chip);
    h.engine.dispatch({ type: "bet", spot });
  };
  const deal = async () => {
    h.engine.dispatch({ type: "deal" });
    await flush();
  };
  return { ...h, shoe, bet, deal, view: () => h.engine.getView() };
}

describe("betting", () => {
  test("summarises bets in player, tie, banker order", async () => {
    const t = await table("");
    expect(t.view().message).toBe("Bet on player, banker or tie, then deal.");
    t.bet("banker");
    expect(t.view().message).toBe("Banker 5,000. Deal when ready.");
    t.bet("player", 1000);
    t.bet("tie");
    expect(t.view().message).toBe("Player 1,000, tie 1,000, banker 5,000. Deal when ready.");
    expect(t.view().spots.map((s) => [s.spot, s.stake])).toEqual([
      ["player", 1000],
      ["tie", 1000],
      ["banker", 5000],
    ]);
  });

  test("undo takes back the last chip, clear takes back all", async () => {
    const t = await table("");
    t.bet("player");
    t.bet("tie", 1000);
    t.engine.dispatch({ type: "undo" });
    expect(t.view().message).toBe("Player 5,000.");
    t.engine.dispatch({ type: "undo" });
    expect(t.view()).toMatchObject({ message: "No bets down.", canUndo: false });
    t.bet("banker");
    t.engine.dispatch({ type: "clear" });
    expect(t.view().message).toBe("Bets cleared.");
    expect(t.ledger.reserved).toBe(0);
  });

  test("needs a bet to deal and cash to bet", async () => {
    const t = await table("", { buyIn: 1000 });
    await t.deal();
    expect(t.view().message).toBe("Place a bet first: pick a chip, then tap player, banker or tie.");
    t.bet("player");
    expect(t.view().message).toBe("You don't have 5,000 in cash.");
  });

  test("ignores spots that don't exist", async () => {
    const t = await table("");
    t.engine.dispatch({ type: "bet", spot: "dragon" as BaccaratSpot });
    expect(t.ledger.reserved).toBe(0);
  });
});

describe("dealing", () => {
  test("stops on a natural after four cards, 320 ms apart", async () => {
    const t = await table("4♠ 3♥ 4♦ 3♣");
    t.bet("player");
    t.engine.dispatch({ type: "deal" });
    expect(t.view()).toMatchObject({ busy: true, message: "Dealing…", canLeave: false });
    await flush();
    expect(t.pauses).toEqual([320, 320, 320, 320]);
    expect(t.view().player).toMatchObject({ total: 8, won: true });
    expect(t.view().banker).toMatchObject({ total: 6, won: false });
    expect(t.view().message).toBe("Player wins 8 to 6, a natural. You win 5,000.");
    expect(t.lastEntry()).toMatchObject({
      game: "Baccarat",
      wager: 5000,
      net: 5000,
      detail: "Player wins 8 to 6, a natural. Bets on player 5,000.",
    });
    expect(t.view().road).toEqual(["P"]);
  });

  test("draws third cards 450 ms apart by the tableau", async () => {
    const t = await table("2♠ K♥ 3♦ 5♣ 4♠ 2♥");
    t.bet("banker");
    t.bet("banker");
    await t.deal();
    expect(t.pauses).toEqual([320, 320, 320, 320, 450, 450]);
    expect(t.view().player.cards).toHaveLength(3);
    expect(t.view().banker.cards).toHaveLength(3);
    expect(t.view().message).toBe("Player wins 9 to 7. You lose 10,000.");
    expect(t.lastEntry()?.detail).toBe("Player wins 9 to 7. Bets on banker 10,000.");
  });

  test("banker stands on 6 when the player's third card is an 8", async () => {
    const t = await table("2♠ 3♥ 2♦ 3♣ 8♠");
    t.bet("banker", 20_000);
    await t.deal();
    expect(t.view().banker.cards).toHaveLength(2);
    expect(t.view().message).toBe("Banker wins 6 to 2. You win 19,000.");
  });

  test("banker draws on 5 when the player stands", async () => {
    const t = await table("3♠ 2♥ 3♦ 3♣ 4♠");
    t.bet("banker");
    await t.deal();
    expect(t.view().player.cards).toHaveLength(2);
    expect(t.view().message).toBe("Banker wins 9 to 6. You win 4,750.");
  });

  test("a tie pays 8:1 and pushes the other bets", async () => {
    const t = await table("4♠ 4♥ 3♦ 3♣");
    t.bet("player");
    t.bet("banker");
    t.bet("tie", 1000);
    await t.deal();
    expect(t.view().message).toBe("Tie at 7. You win 8,000.");
    expect(t.lastEntry()?.detail).toBe("Tie at 7. Bets on player 5,000, tie 1,000, banker 5,000.");
    expect(t.view().spots.map((s) => [s.spot, s.stake, s.outcome, s.won])).toEqual([
      ["player", 5000, 0, false],
      ["tie", 1000, 8000, true],
      ["banker", 5000, 0, false],
    ]);
    expect(t.view().player.won && t.view().banker.won).toBe(true);
    expect(t.view().road).toEqual(["T"]);
  });

  test("notes a new shoe while dealing", async () => {
    const t = await table("4♠ 3♥ 4♦ 3♣");
    t.shoe.low = true;
    t.bet("player");
    t.engine.dispatch({ type: "deal" });
    expect(t.view().message).toBe("New shoe. Dealing…");
    await flush();
    expect(t.shoe.shuffles).toBe(1);
    expect(t.view().message).toBe("Player wins 8 to 6, a natural. You win 5,000.");
  });
});

describe("after the deal", () => {
  test("shows the last bets until new chips go down", async () => {
    const t = await table("4♠ 3♥ 4♦ 3♣");
    t.bet("player");
    await t.deal();
    expect(t.view().spots[0]).toMatchObject({ stake: 5000, outcome: 5000, won: true });
    t.bet("tie", 1000);
    expect(t.view().spots.map((s) => [s.stake, s.outcome])).toEqual([
      [0, null],
      [1000, null],
      [0, null],
    ]);
    expect(t.view().rebet).toBeNull();
  });

  test("rebet restores the full set of bets and deals", async () => {
    const t = await table("4♠ 4♥ 3♦ 3♣ 9♠ 9♥ K♦ K♣");
    t.bet("player");
    t.bet("banker");
    t.bet("tie", 1000);
    await t.deal();
    expect(t.view().rebet).toEqual({ amount: 11_000, disabled: false });
    t.engine.dispatch({ type: "rebet" });
    await flush();
    expect(t.lastEntry()).toMatchObject({
      seq: 3,
      wager: 11_000,
      detail: "Tie at 9, a natural. Bets on player 5,000, tie 1,000, banker 5,000.",
    });
  });

  test("explains when the rebet can't be covered", async () => {
    const t = await table("2♠ 3♥ 2♦ 3♣ 8♠", { buyIn: 5000 });
    t.bet("player");
    await t.deal();
    expect(t.view().rebet).toEqual({ amount: 5000, disabled: true });
    t.engine.dispatch({ type: "rebet" });
    expect(t.view().message).toBe("You need 5,000 in cash to repeat those bets.");
  });

  test("the road keeps the last 40 results", async () => {
    const h = await engineHarness((deps) => new BaccaratEngine(deps), { rng: seededRng(9), chip: 1000 });
    for (let i = 0; i < 45; i++) {
      h.engine.dispatch({ type: "bet", spot: "player" });
      h.engine.dispatch({ type: "deal" });
      await flush();
    }
    const road = h.engine.getView().road;
    expect(road).toHaveLength(40);
    expect(road.every((mark) => mark === "P" || mark === "B" || mark === "T")).toBe(true);
    expect(h.ledger.entries()).toHaveLength(46);
  });
});

describe("locks and leaving", () => {
  test("locks only while dealing", async () => {
    const t = await table("4♠ 3♥ 4♦ 3♣");
    t.bet("player");
    expect(t.engine.canLeave()).toBe(true);
    t.engine.dispatch({ type: "deal" });
    expect(t.engine.canLeave()).toBe(false);
    expect(t.engine.lockMessage()).toBe("Wait for this hand to finish.");
    await flush();
    expect(t.engine.canLeave()).toBe(true);
  });

  test("leave returns unplayed chips", async () => {
    const t = await table("");
    t.bet("player");
    t.bet("tie", 1000);
    t.engine.leave();
    expect(t.ledger.reserved).toBe(0);
    expect(t.view().canUndo).toBe(false);
  });
});
