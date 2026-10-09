// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, test } from "vitest";
import { engineHarness, type HarnessOptions } from "@/test/engineHarness";
import { renderLive, settle } from "@/test/liveGame";
import { scriptedRng } from "@/test/scriptedRng";
import { RouletteEngine } from "../engine";
import { RouletteActions } from "./RouletteActions";
import { RouletteRules } from "./RouletteRules";
import { RouletteTable } from "./RouletteTable";

const never = () => new Promise<void>(() => {});

async function table(results: readonly number[], options: HarnessOptions = {}) {
  const h = await engineHarness((deps) => new RouletteEngine(deps), { rng: scriptedRng(results), ...options });
  return { ...h, ...renderLive(h.engine, RouletteTable, RouletteActions) };
}

const cell = (name: string) => screen.getByRole("button", { name: `Bet on ${name}` });
const button = (name: string) => screen.getByRole("button", { name });
const strip = (container: HTMLElement) => {
  const element = container.querySelector<HTMLElement>(".strip");
  if (!element) throw new Error("No wheel strip");
  return element;
};
const position = (container: HTMLElement) => strip(container).style.getPropertyValue("--i");

afterEach(cleanup);

describe("Board", () => {
  test("has every bet with its place on both grids", async () => {
    await table([]);
    expect(screen.getAllByRole("button", { name: /^Bet on / })).toHaveLength(49);
    const zero = cell("zero");
    expect([zero.style.getPropertyValue("--h"), zero.style.getPropertyValue("--v")]).toEqual(["1 / 1 / 4 / 2", "1 / 3 / 2 / 6"]);
    expect(zero.className).toBe("cell num green");
    expect(cell("2nd 12, pays 2 to 1").className).toBe("cell out side");
    expect(cell("red, pays 1 to 1").querySelector(".swatch.red")).toBeTruthy();
    expect(cell("column 1, pays 2 to 1").textContent).toBe("2 to 1");
  });

  test("shows chips where they were placed", async () => {
    await table([]);
    fireEvent.click(cell("17 black, pays 35 to 1"));
    fireEvent.click(cell("17 black, pays 35 to 1"));
    expect(within(cell("17 black, pays 35 to 1")).getByLabelText("10,000 on this bet").textContent).toBe("10K");
    expect(["Undo", "Clear", "Spin"].map((name) => button(name).getAttribute("aria-disabled"))).toEqual([null, null, null]);
  });
});

describe("WheelStrip", () => {
  test("rests on the first repeat of the wheel", async () => {
    const t = await table([]);
    expect(t.container.querySelectorAll(".pocket")).toHaveLength(222);
    expect(position(t.container)).toBe("37");
    expect(strip(t.container).classList.contains("spinning")).toBe(false);
    expect(screen.getByLabelText("No result yet").textContent).toBe("–");
  });

  test("spins to the target, settles on transitionend and jumps back to rest", async () => {
    const t = await table([17], { reducedMotion: false, pause: never });
    fireEvent.click(cell("17 black, pays 35 to 1"));
    fireEvent.click(cell("red, pays 1 to 1"));
    await settle(() => fireEvent.click(button("Spin")));
    expect(strip(t.container).classList.contains("spinning")).toBe(true);
    expect(position(t.container)).toBe(String(4 * 37 + 8));
    expect(button("Spin").getAttribute("aria-disabled")).toBe("true");

    await settle(() => fireEvent.transitionEnd(t.container.querySelector(".pocket") ?? document.body));
    expect(strip(t.container).classList.contains("spinning")).toBe(true);

    await settle(() => fireEvent.transitionEnd(strip(t.container)));
    expect(strip(t.container).classList.contains("spinning")).toBe(false);
    expect(position(t.container)).toBe(String(37 + 8));
    expect(screen.getByLabelText("Last result 17").className).toBe("ball black");
    expect(screen.getByLabelText("Recent numbers").textContent).toBe("17");
    const winner = cell("17 black, pays 35 to 1");
    expect(winner.className).toBe("cell num black paid hit");
    expect(within(winner).getByLabelText("5,000 on this bet")).toBeTruthy();
    expect(within(cell("red, pays 1 to 1")).queryByLabelText(/on this bet/)).toBeNull();
    expect(button("Spin 10,000 again").getAttribute("aria-disabled")).toBeNull();
  });

  test("doesn't spin when motion is reduced", async () => {
    const t = await table([0]);
    fireEvent.click(cell("zero"));
    await settle(() => fireEvent.click(button("Spin")));
    expect(strip(t.container).classList.contains("spinning")).toBe(false);
    expect(position(t.container)).toBe("37");
    expect(screen.getByLabelText("Last result 0").className).toBe("ball green");
  });
});

test("the rules list each section and the house payouts", () => {
  render(<RouletteRules />);
  expect(screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent)).toEqual(["The wheel", "Payouts"]);
  const items = screen.getAllByRole("listitem").map((li) => li.textContent);
  expect(items).toEqual(
    expect.arrayContaining([
      "Single zero, numbers 0 to 36.",
      "A straight-up bet on any single number, 0 included, pays 35 to 1.",
      "Dozens and columns pay 2 to 1.",
      "When 0 comes up, every outside bet loses.",
    ]),
  );
});
