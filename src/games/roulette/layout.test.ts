import { expect, test } from "vitest";
import { BOARD, STRIP } from "./layout";
import { isRouletteBetKey, restIndex, spinTargetIndex } from "./rules";

const cell = (key: string) => BOARD.find((c) => c.key === key);

test("has 49 cells in board order: numbers, columns, dozens, then even-money bets", () => {
  expect(BOARD).toHaveLength(49);
  expect(BOARD.map((c) => c.key).slice(0, 3)).toEqual(["n0", "n1", "n2"]);
  expect(BOARD.map((c) => c.key).slice(37)).toEqual(["c1", "c2", "c3", "d1", "d2", "d3", "low", "even", "red", "black", "odd", "high"]);
  expect(new Set(BOARD.map((c) => c.key)).size).toBe(49);
  for (const c of BOARD) expect(isRouletteBetKey(c.key)).toBe(true);
});

test("places numbers on both grids", () => {
  expect(cell("n0")).toMatchObject({ wide: "1 / 1 / 4 / 2", narrow: "1 / 3 / 2 / 6", aria: "zero", color: "green" });
  expect(cell("n1")).toMatchObject({ wide: "3 / 2", narrow: "2 / 3", aria: "1 red, pays 35 to 1", label: "1" });
  expect(cell("n2")).toMatchObject({ wide: "2 / 2", narrow: "2 / 4" });
  expect(cell("n36")).toMatchObject({ wide: "1 / 13", narrow: "13 / 5", color: "red" });
});

test("places columns, dozens and even-money bets", () => {
  expect(cell("c1")).toMatchObject({ label: "2 to 1", wide: "3 / 14", narrow: "14 / 3", side: false, aria: "column 1, pays 2 to 1" });
  expect(cell("c3")).toMatchObject({ wide: "1 / 14", narrow: "14 / 5" });
  expect(cell("d2")).toMatchObject({ label: "2nd 12", wide: "4 / 6 / 5 / 10", narrow: "6 / 2 / 10 / 3", side: true });
  expect(cell("low")).toMatchObject({ label: "1–18", wide: "5 / 2 / 6 / 4", narrow: "2 / 1 / 4 / 2", aria: "1–18, pays 1 to 1" });
  expect(cell("red")).toMatchObject({ label: { swatch: "red" }, wide: "5 / 6 / 6 / 8", aria: "red, pays 1 to 1" });
  expect(cell("high")).toMatchObject({ label: "19–36", wide: "5 / 12 / 6 / 14", narrow: "12 / 1 / 14 / 2" });
});

test("the strip is the wheel six times over, so rest and spin targets land on the same pocket", () => {
  expect(STRIP).toHaveLength(222);
  expect(STRIP.slice(0, 3)).toEqual([
    { n: 0, color: "green" },
    { n: 32, color: "red" },
    { n: 15, color: "black" },
  ]);
  expect(STRIP[restIndex(17)]?.n).toBe(17);
  expect(STRIP[spinTargetIndex(17)]?.n).toBe(17);
});
