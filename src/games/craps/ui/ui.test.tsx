// @vitest-environment jsdom
import { cleanup, fireEvent, screen, within } from "@testing-library/react";
import { afterEach, expect, test } from "vitest";
import type { Rng } from "@/lib/random/rng";
import { engineHarness } from "@/test/engineHarness";
import { renderLive, settle } from "@/test/liveGame";
import { CrapsEngine } from "../engine";
import { CrapsActions } from "./CrapsActions";
import { CrapsTable } from "./CrapsTable";

async function table() {
  const dice: number[] = [];
  const queuedDice: Rng = {
    int: () => {
      const face = dice.shift();
      if (face === undefined) throw new Error("No die queued");
      return face - 1;
    },
  };
  const h = await engineHarness((deps) => new CrapsEngine(deps), { rng: queuedDice });
  const rendered = renderLive(h.engine, CrapsTable, CrapsActions);
  const roll = (d1: number, d2: number, name = "Roll") => {
    dice.push(d1, d2);
    return settle(() => fireEvent.click(button(name)));
  };
  return { ...h, ...rendered, roll };
}

const spot = (name: string) => screen.getByRole("button", { name: new RegExp(`^${name}, pays`) });
const button = (name: string) => screen.getByRole("button", { name });
const off = () => screen.getByText("Off");
const box = (label: string) => screen.getByText(label, { selector: ".box" });

afterEach(cleanup);

test("the come-out shows the off puck, empty dice and closed odds", async () => {
  const t = await table();
  expect(off().classList.contains("away")).toBe(false);
  expect([...t.container.querySelectorAll(".box")].map((b) => b.textContent)).toEqual(["4", "5", "Six", "8", "Nine", "10"]);
  expect(t.container.querySelectorAll(".empty")).toHaveLength(2);
  expect(spot("Odds").classList.contains("closed")).toBe(true);
  expect(spot("Odds").getAttribute("aria-label")).toBe("Odds, pays True odds behind the pass line");
  expect(spot("Pass line").classList.contains("closed")).toBe(false);
  expect(spot("Field").textContent).toContain("2 3 4 9 10 11 12");
  expect(screen.queryByRole("button", { name: "Same bets, roll" })).toBeNull();
});

test("setting a point moves the puck and opens the odds", async () => {
  const t = await table();
  fireEvent.click(spot("Pass line"));
  await t.roll(4, 1);
  expect(off().classList.contains("away")).toBe(true);
  expect(box("5").classList.contains("isPoint")).toBe(true);
  expect(within(box("5")).getByText("On")).toBeTruthy();
  expect(screen.getAllByRole("img").map((die) => die.getAttribute("aria-label"))).toEqual(["4", "1"]);
  expect(t.container.querySelector(".sum")?.textContent).toBe("5");
  expect(screen.getByLabelText("Recent rolls").textContent).toBe("5");
  expect(spot("Odds").classList.contains("closed")).toBe(false);
  expect(spot("Odds").getAttribute("aria-label")).toBe("Odds, pays 3 to 2 on 5, up to 4×");
  expect(spot("Pass line").classList.contains("closed")).toBe(false);
  expect(spot("Don't pass").classList.contains("closed")).toBe(true);
  expect(button("Same bets, roll").getAttribute("aria-disabled")).toBeNull();
});

test("a seven out shows the loss and marks the seven in the history", async () => {
  const t = await table();
  fireEvent.click(spot("Pass line"));
  await t.roll(4, 1);
  await t.roll(3, 4);
  expect(within(spot("Pass line")).getByText("−5,000")).toBeTruthy();
  expect([...screen.getByLabelText("Recent rolls").children].map((li) => [li.textContent, li.className])).toEqual([
    ["7", "seven"],
    ["5", ""],
  ]);
  expect(off().classList.contains("away")).toBe(false);
});
