// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, expect, test } from "vitest";
import { engineHarness } from "@/test/engineHarness";
import { renderLive, settle } from "@/test/liveGame";
import { stackedShoe } from "@/test/stackedShoe";
import { BaccaratEngine } from "../engine";
import { BaccaratActions } from "./BaccaratActions";
import { BaccaratRules } from "./BaccaratRules";
import { BaccaratTable } from "./BaccaratTable";

async function table(cards: string) {
  const h = await engineHarness((deps) => new BaccaratEngine(deps, stackedShoe(cards)));
  return { ...h, ...renderLive(h.engine, BaccaratTable, BaccaratActions) };
}

const spot = (name: string) => screen.getByRole("button", { name: new RegExp(`^Bet on ${name}, pays`) });
const button = (name: string) => screen.getByRole("button", { name });
const isOff = (name: string) => button(name).getAttribute("aria-disabled") === "true";

afterEach(cleanup);

test("lays out both sides and the three spots", async () => {
  const t = await table("9♠ 7♥ K♣ Q♦");
  expect(t.container.querySelectorAll(".slot")).toHaveLength(4);
  expect(["Player", "Tie", "Banker"].map((name) => spot(name).getAttribute("aria-label"))).toEqual([
    "Bet on Player, pays 1 to 1",
    "Bet on Tie, pays 8 to 1",
    "Bet on Banker, pays 0.95 to 1",
  ]);
  expect(screen.getByText("Banker wins pay 0.95 to 1. A tie pushes player and banker bets.")).toBeTruthy();
  expect(screen.getByLabelText("Recent results").textContent).toBe("");
  expect(["Undo", "Clear", "Deal"].map(isOff)).toEqual([true, true, true]);
});

test("chips land on the spot that was tapped", async () => {
  await table("9♠ 7♥ K♣ Q♦");
  fireEvent.click(spot("Tie"));
  fireEvent.click(spot("Tie"));
  expect(within(spot("Tie")).getByLabelText("10,000 on this bet").textContent).toBe("10K");
  expect(["Undo", "Clear", "Deal"].map(isOff)).toEqual([false, false, false]);
});

test("a natural marks the winner, pays the spot and adds to the road", async () => {
  const t = await table("9♠ 7♥ K♣ Q♦");
  fireEvent.click(spot("Player"));
  await settle(() => fireEvent.click(button("Deal")));
  const sides = t.container.querySelectorAll(".side");
  expect([...sides].map((side) => [side.querySelector(".total")?.textContent, side.classList.contains("won")])).toEqual([
    ["9", true],
    ["7", false],
  ]);
  expect(spot("Player").classList.contains("won")).toBe(true);
  expect(within(spot("Player")).getByText("+5,000")).toBeTruthy();
  expect(within(spot("Player")).getByLabelText("5,000 on this bet")).toBeTruthy();
  expect(screen.getByLabelText("Recent results").textContent).toBe("Last 1P");
  expect(screen.getByTitle("Player").classList.contains("P")).toBe(true);
  expect(["Undo", "Clear", "Deal 5,000 again"].map(isOff)).toEqual([true, true, false]);
});

test("a tie lights both sides and pushes", async () => {
  const t = await table("9♠ 9♥ K♣ Q♦");
  fireEvent.click(spot("Banker"));
  await settle(() => fireEvent.click(button("Deal")));
  expect([...t.container.querySelectorAll(".side")].map((side) => side.classList.contains("won"))).toEqual([true, true]);
  expect(within(spot("Banker")).getByText("Push")).toBeTruthy();
  expect(screen.getByTitle("Tie").textContent).toBe("T");
});

test("the rules list each section and the house payouts", () => {
  render(<BaccaratRules />);
  expect(screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent)).toEqual(["Betting", "Counting", "Drawing", "Payouts"]);
  const items = screen.getAllByRole("listitem").map((li) => li.textContent);
  expect(items).toEqual(
    expect.arrayContaining([
      "Player draws on 0 to 5 and stands on 6 or 7.",
      "If Player drew, Banker draws on 0 to 2; on 3 unless Player's third card is worth 8; on 4 if it's worth 2 to 7; on 5 if it's worth 4 to 7; on 6 if it's worth 6 or 7. Banker stands on 7.",
      "Banker pays 0.95 to 1, a 5% commission.",
      "Tie pays 8 to 1, and a tie pushes Player and Banker bets.",
    ]),
  );
});
