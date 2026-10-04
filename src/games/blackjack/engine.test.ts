import { describe, expect, test } from "vitest";
import type { Card } from "@/lib/cards/card";
import { engineHarness, flush, type HarnessOptions } from "@/test/engineHarness";
import { stackedShoe } from "@/test/stackedShoe";
import { BlackjackEngine } from "./engine";

const codes = (cards: readonly Card[] | undefined) => (cards ?? []).map((c) => c.r + c.s).join(" ");

async function table(cards: string, options: HarnessOptions = {}) {
  const shoe = stackedShoe(cards);
  const h = await engineHarness((deps) => new BlackjackEngine(deps, shoe), options);
  return { ...h, shoe, view: () => h.engine.getView() };
}

async function dealt(cards: string, options: HarnessOptions = {}) {
  const t = await table(cards, options);
  t.engine.dispatch({ type: "bet" });
  t.engine.dispatch({ type: "deal" });
  await flush();
  return t;
}

describe("betting", () => {
  test("starts with an empty table and the opening message", async () => {
    const { view } = await table("");
    expect(view()).toMatchObject({
      message: "Pick a chip, then tap the bet circle.",
      phase: "bet",
      hands: [],
      betting: true,
      bet: 0,
      canDeal: false,
      rebet: null,
      canLeave: true,
    });
  });

  test("adds chips, clears them and explains a missing bet", async () => {
    const { engine, ledger, view } = await table("");
    engine.dispatch({ type: "deal" });
    expect(view().message).toBe("Place a bet first: pick a chip, then tap the bet circle.");
    engine.dispatch({ type: "bet" });
    expect(view().message).toBe("Betting 5,000. Deal when ready.");
    engine.dispatch({ type: "bet" });
    expect(view()).toMatchObject({ message: "Betting 10,000. Deal when ready.", bet: 10_000, canClear: true, canDeal: true });
    expect(ledger.reserved).toBe(10_000);
    engine.dispatch({ type: "clear" });
    expect(view()).toMatchObject({ message: "Bet cleared.", bet: 0 });
    expect(ledger.reserved).toBe(0);
  });

  test("refuses a chip the player can't cover", async () => {
    const { engine, view, ledger } = await table("", { buyIn: 1000 });
    engine.dispatch({ type: "bet" });
    expect(view().message).toBe("You don't have 5,000 in cash.");
    expect(ledger.reserved).toBe(0);
  });

  test("ignores play actions while betting", async () => {
    const { engine, view } = await table("");
    const before = view();
    for (const type of ["hit", "stand", "double", "split"] as const) engine.dispatch({ type });
    expect(view()).toBe(before);
  });
});

describe("the deal", () => {
  test("deals player, dealer, player, dealer 260 ms apart, then prompts", async () => {
    const { view, pauses } = await dealt("A♠ 9♥ 6♦ 7♣");
    expect(pauses).toEqual([260, 260, 260, 260]);
    expect(codes(view().hands[0]?.cards)).toBe("A♠ 6♦");
    expect(view().dealer).toMatchObject({ holeHidden: true, total: "showing 9" });
    expect(codes(view().dealer.cards)).toBe("9♥ 7♣");
    expect(view()).toMatchObject({
      message: "You have 7 / 17. Hit, stand or double?",
      phase: "play",
      betting: false,
      canAct: true,
      canDouble: true,
      canSplit: false,
      canLeave: false,
    });
  });

  test("is busy while cards are coming out", async () => {
    const t = await table("A♠ 9♥ 6♦ 7♣");
    t.engine.dispatch({ type: "bet" });
    t.engine.dispatch({ type: "deal" });
    expect(t.engine.isBusy()).toBe(true);
    expect(t.view()).toMatchObject({ busy: true, canLeave: false, message: "Dealing…" });
    t.engine.dispatch({ type: "bet" });
    await flush();
    expect(t.engine.isBusy()).toBe(false);
    expect(t.ledger.reserved).toBe(5000);
  });

  test("starts a new shoe when the cut card is reached", async () => {
    const t = await table("A♠ 9♥ 6♦ 7♣");
    t.shoe.low = true;
    t.engine.dispatch({ type: "bet" });
    t.engine.dispatch({ type: "deal" });
    expect(t.view().message).toBe("New shoe. Dealing…");
    await flush();
    expect(t.shoe.shuffles).toBe(1);
    expect(t.view().message).toBe("New shoe. You have 7 / 17. Hit, stand or double?");
  });
});

describe("naturals and the dealer peek", () => {
  test("blackjack pays 3:2 straight away", async () => {
    const { view, lastEntry, ledger } = await dealt("A♠ 9♥ K♦ 7♣");
    expect(view()).toMatchObject({
      phase: "done",
      message: "Dealer: 16. You win 7,500. Place a new bet or deal the same again.",
      dealer: { holeHidden: false, total: "16" },
    });
    expect(view().hands[0]).toMatchObject({ label: "Blackjack", outcome: { net: 7500, label: "Blackjack" } });
    expect(lastEntry()).toMatchObject({ game: "Blackjack", wager: 5000, net: 7500, detail: "You: blackjack. Dealer: 16. Win." });
    expect(ledger.balance).toBe(107_500);
  });

  test.each([
    ["an ace", "10♠ A♥ 9♦ K♣"],
    ["a ten", "10♠ K♥ 9♦ A♣"],
  ])("the dealer peeks with %s up and ends the hand on blackjack", async (_, cards) => {
    const { view, lastEntry } = await dealt(cards);
    expect(view().message).toBe("Dealer: blackjack. You lose 5,000. Place a new bet or deal the same again.");
    expect(lastEntry()?.detail).toBe("You: 19. Dealer: blackjack. Lose.");
  });

  test("a peek without blackjack lets the player act", async () => {
    const { view } = await dealt("10♠ K♥ 9♦ 8♣");
    expect(view().message).toBe("You have 19. Hit, stand or double?");
  });

  test("two blackjacks push", async () => {
    const { view, lastEntry } = await dealt("A♠ A♥ K♦ K♣");
    expect(view().hands[0]?.outcome).toEqual({ net: 0, label: "Push" });
    expect(view().message).toBe("Dealer: blackjack. You break even. Place a new bet or deal the same again.");
    expect(lastEntry()?.detail).toBe("You: blackjack. Dealer: blackjack. Push.");
  });
});

describe("playing the hand", () => {
  test("a bust ends the round and the dealer doesn't draw", async () => {
    const t = await dealt("10♠ 9♥ 6♦ 7♣ K♠");
    expect(t.view().message).toBe("You have 16. Hit, stand or double?");
    t.engine.dispatch({ type: "hit" });
    await flush();
    expect(codes(t.view().dealer.cards)).toBe("9♥ 7♣");
    expect(t.view().hands[0]).toMatchObject({ label: "Bust 26", outcome: { net: -5000, label: "Bust" } });
    expect(t.lastEntry()?.detail).toBe("You: 26, bust. Dealer: 16. Lose.");
    expect(t.pauses.slice(4)).toEqual([450]);
  });

  test("hitting to 21 stands automatically", async () => {
    const t = await dealt("5♠ 9♥ 6♦ 7♣ 10♠ 2♥");
    t.engine.dispatch({ type: "hit" });
    await flush();
    expect(t.lastEntry()?.detail).toBe("You: 21. Dealer: 18. Win.");
  });

  test("the dealer stands on soft 17", async () => {
    const t = await dealt("10♠ 6♥ 8♦ A♣");
    t.engine.dispatch({ type: "stand" });
    await flush();
    expect(codes(t.view().dealer.cards)).toBe("6♥ A♣");
    expect(t.view().dealer.total).toBe("7 / 17");
    expect(t.lastEntry()?.detail).toBe("You: 18. Dealer: 17. Win.");
    expect(t.view().message).toBe("Dealer: 17. You win 5,000. Place a new bet or deal the same again.");
  });

  test("the dealer draws to 17, 450 ms apart", async () => {
    const t = await dealt("10♠ 10♥ 8♦ 6♣ 5♠");
    t.engine.dispatch({ type: "stand" });
    expect(t.view()).toMatchObject({ phase: "dealer", busy: true, message: "Dealer's turn." });
    await flush();
    expect(t.pauses.slice(4)).toEqual([450, 450]);
    expect(t.lastEntry()?.detail).toBe("You: 18. Dealer: 21. Lose.");
  });

  test("double takes one card and doubles the stake", async () => {
    const t = await dealt("5♠ 9♥ 6♦ 7♣ 10♠ 2♥");
    t.engine.dispatch({ type: "double" });
    await flush();
    expect(t.view().hands[0]).toMatchObject({ bet: 10_000, label: "21" });
    expect(t.lastEntry()).toMatchObject({ wager: 10_000, net: 10_000, detail: "You: 21, doubled. Dealer: 18. Win." });
  });

  test("double isn't offered without the cash to cover it", async () => {
    const t = await dealt("5♠ 9♥ 6♦ 7♣", { buyIn: 5000 });
    expect(t.view()).toMatchObject({ message: "You have 11. Hit or stand?", canDouble: false });
    const before = t.view();
    t.engine.dispatch({ type: "double" });
    expect(t.view()).toBe(before);
  });
});

describe("splitting", () => {
  test("splits a pair into two hands played in turn", async () => {
    const t = await dealt("8♠ 9♥ 8♦ 7♣ 3♠ 10♥ K♦");
    expect(t.view().message).toBe("You have 16. Hit, stand, double or split?");
    t.engine.dispatch({ type: "split" });
    expect(t.view().hands.map((h) => codes(h.cards))).toEqual(["8♠ 3♠", "8♦ 10♥"]);
    expect(t.view().hands.map((h) => h.active)).toEqual([true, false]);
    expect(t.view().message).toBe("Hand 1: 11. Hit, stand or double?");
    expect(t.ledger.reserved).toBe(10_000);
    t.engine.dispatch({ type: "stand" });
    expect(t.view().message).toBe("Hand 2: 18. Hit, stand or double?");
    t.engine.dispatch({ type: "stand" });
    await flush();
    expect(t.lastEntry()).toMatchObject({
      wager: 10_000,
      net: 10_000,
      detail: "Split into 2 hands. Dealer: 26, bust. Hand 1: 11, win. Hand 2: 18, win.",
    });
    expect(t.view().message).toBe("Dealer: 26, bust. You win 10,000. Place a new bet or deal the same again.");
  });

  test("splits by value, so ten and king pair up", async () => {
    const { view } = await dealt("10♠ 9♥ K♦ 7♣");
    expect(view()).toMatchObject({ canSplit: true, message: "You have 20. Hit, stand, double or split?" });
  });

  test("split aces get one card each, can't be resplit, and 21 isn't blackjack", async () => {
    const t = await dealt("A♠ 9♥ A♦ 7♣ K♠ 5♥ 10♦");
    expect(t.view().message).toBe("You have 2 / 12. Hit, stand, double or split?");
    t.engine.dispatch({ type: "split" });
    await flush();
    expect(t.view().hands.map((h) => h.label)).toEqual(["21", "6 / 16"]);
    expect(t.view().hands.map((h) => h.outcome)).toEqual([
      { net: 5000, label: "Win" },
      { net: 5000, label: "Win" },
    ]);
    expect(t.lastEntry()?.detail).toBe("Split into 2 hands. Dealer: 26, bust. Hand 1: 21, win. Hand 2: 16, win.");
  });

  test("stops at four hands", async () => {
    const t = await dealt("8♠ 9♥ 8♦ 7♣ 8♥ 8♣ 8♠ 2♦ 3♦ 4♦");
    t.engine.dispatch({ type: "split" });
    expect(t.view().message).toBe("Hand 1: 16. Hit, stand, double or split?");
    t.engine.dispatch({ type: "split" });
    t.engine.dispatch({ type: "split" });
    expect(t.view().hands).toHaveLength(4);
    expect(t.view().message).toBe("Hand 1: 11. Hit, stand or double?");
    t.engine.dispatch({ type: "stand" });
    t.engine.dispatch({ type: "stand" });
    t.engine.dispatch({ type: "stand" });
    expect(t.view()).toMatchObject({ message: "Hand 4: 16. Hit, stand or double?", canSplit: false });
    t.engine.dispatch({ type: "split" });
    expect(t.view().hands).toHaveLength(4);
    expect(t.ledger.reserved).toBe(20_000);
  });
});

describe("locks and leaving", () => {
  test("can't be left mid-round", async () => {
    const t = await dealt("10♠ 9♥ 6♦ 7♣");
    expect(t.engine.canLeave()).toBe(false);
    expect(t.engine.lockMessage()).toBe("Finish this hand first.");
  });

  test("leave returns an unplayed bet", async () => {
    const t = await table("");
    t.engine.dispatch({ type: "bet" });
    t.engine.dispatch({ type: "bet" });
    t.engine.leave();
    expect(t.ledger.reserved).toBe(0);
    expect(t.view().bet).toBe(0);
  });
});

describe("dealing the same again", () => {
  test("rebets the last stake and deals", async () => {
    const t = await dealt("A♠ 9♥ K♦ 7♣ A♣ 9♦ K♥ 7♠");
    expect(t.view().rebet).toEqual({ amount: 5000, disabled: false });
    t.engine.dispatch({ type: "rebet" });
    await flush();
    expect(t.lastEntry()).toMatchObject({ seq: 3, wager: 5000, net: 7500 });
    expect(t.ledger.balance).toBe(115_000);
  });

  test("explains when the player can't cover the rebet", async () => {
    const t = await dealt("10♠ A♥ 9♦ K♣", { buyIn: 5000 });
    expect(t.view().rebet).toEqual({ amount: 5000, disabled: true });
    t.engine.dispatch({ type: "rebet" });
    expect(t.view().message).toBe("You need 5,000 in cash to repeat that bet.");
  });

  test("offers Deal again only after a finished round with no new bet", async () => {
    const t = await dealt("A♠ 9♥ K♦ 7♣");
    t.engine.dispatch({ type: "bet" });
    expect(t.view()).toMatchObject({ rebet: null, canDeal: true });
  });
});
