// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, test } from "vitest";
import { engineHarness } from "@/test/engineHarness";
import { renderLive, settle } from "@/test/liveGame";
import { stackedShoe } from "@/test/stackedShoe";
import { BlackjackEngine } from "../engine";
import { BlackjackActions } from "./BlackjackActions";
import { BlackjackRules } from "./BlackjackRules";
import { BlackjackTable } from "./BlackjackTable";

async function table(cards: string) {
  const h = await engineHarness((deps) => new BlackjackEngine(deps, stackedShoe(cards)));
  const rendered = renderLive(h.engine, BlackjackTable, BlackjackActions);
  return { ...h, ...rendered };
}

const button = (name: string) => screen.getByRole("button", { name });
const isOff = (name: string) => button(name).getAttribute("aria-disabled") === "true";
const circle = () => screen.queryByRole("button", { name: "Add a 5,000 chip to your bet" });
const cardNames = () => screen.getAllByRole("img").map((card) => card.getAttribute("aria-label"));
const isFresh = (name: string) => screen.getByRole("img", { name }).classList.contains("fresh");

async function betAndDeal() {
  const spot = circle();
  if (spot) fireEvent.click(spot);
  await settle(() => fireEvent.click(button("Deal")));
}

afterEach(cleanup);

describe("BlackjackTable", () => {
  test("starts with empty seats and the bet circle", async () => {
    const t = await table("10♠ 9♥ 7♣ 8♦");
    expect(t.container.querySelectorAll(".slot")).toHaveLength(4);
    expect(screen.getByText("Dealer").childElementCount).toBe(0);
    expect(screen.getByText(/Blackjack pays 3 to 2/).textContent).toBe("Blackjack pays 3 to 2Dealer stands on all 17s");
    expect(circle()?.textContent).toBe("BetTap to add 5K");
    expect([isOff("Clear"), isOff("Deal")]).toEqual([true, true]);
  });

  test("a bet shows on the circle and enables the deal", async () => {
    const t = await table("10♠ 9♥ 7♣ 8♦");
    const spot = circle();
    if (spot) fireEvent.click(spot);
    expect(circle()?.textContent).toBe("5K5,000");
    expect(screen.getByLabelText("5,000 on this bet")).toBeTruthy();
    expect([isOff("Clear"), isOff("Deal")]).toEqual([false, false]);
    expect(t.ledger.reserved).toBe(5000);
  });

  test("deals with the hole card down and offers the moves the hand allows", async () => {
    await table("10♠ 9♥ 7♣ 8♦");
    await betAndDeal();
    expect(cardNames()).toEqual(["9♥", "Face-down card", "10♠", "7♣"]);
    expect(screen.getByText("Dealer").textContent).toBe("Dealershowing 9");
    expect(circle()).toBeNull();
    expect(["Hit", "Stand", "Double", "Split"].map(isOff)).toEqual([false, false, false, true]);
  });

  test("settles with outcome badges and offers the same bet again", async () => {
    await table("10♠ 9♥ 7♣ 8♦");
    await betAndDeal();
    await settle(() => fireEvent.click(button("Stand")));
    expect(cardNames()).toEqual(["9♥", "8♦", "10♠", "7♣"]);
    expect(screen.getByText("Dealer").textContent).toBe("Dealer17");
    expect(screen.getByText("Push").className).toContain("push");
    expect([isOff("Clear"), isOff("Deal 5,000 again")]).toEqual([true, false]);
    expect(circle()?.textContent).toBe("BetTap to add 5K");
  });

  test("a split highlights the active hand and only deals the new cards", async () => {
    const t = await table("8♠ 9♥ 8♣ 7♦ 3♠ 2♥");
    await betAndDeal();
    await settle(() => fireEvent.click(button("Split")));
    const hands = t.container.querySelectorAll(".hand");
    expect(hands).toHaveLength(2);
    expect([...hands].map((hand) => hand.classList.contains("active"))).toEqual([true, false]);
    expect([...hands].map((hand) => hand.querySelector(".total")?.textContent)).toEqual(["11", "10"]);
    expect(screen.getAllByLabelText("5,000 on this bet")).toHaveLength(2);
    expect([isFresh("8♣"), isFresh("3♠"), isFresh("2♥")]).toEqual([false, true, true]);
  });

  test("coming back to the table doesn't replay the deal", async () => {
    const t = await table("10♠ 9♥ 7♣ 8♦");
    await betAndDeal();
    t.unmount();
    renderLive(t.engine, BlackjackTable);
    expect(cardNames()).toHaveLength(4);
    expect(document.querySelectorAll(".fresh")).toHaveLength(0);
  });
});

test("the rules list each section and the house payouts", () => {
  render(<BlackjackRules />);
  expect(screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent)).toEqual(["Goal", "Your turn", "Dealer", "Payouts"]);
  const items = screen.getAllByRole("listitem").map((li) => li.textContent);
  expect(items).toEqual(
    expect.arrayContaining([
      "Draws to 16 and stands on all 17s, soft 17 included.",
      "Blackjack, an ace and a ten-value card as your first two cards, pays 3 to 2.",
      "Split aces get one card each and can't be split again or doubled.",
      "No insurance or surrender. Six decks, reshuffled when the shoe runs low.",
    ]),
  );
});
