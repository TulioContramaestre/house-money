import { NUMBERS, OUTSIDE_NAMES, STRIP_REPEATS, WHEEL, colorOf, straightKey } from "./rules";
import type { OutsideKey, RouletteBetKey, RouletteColor, RouletteResult } from "./types";

export interface BoardCell {
  readonly key: RouletteBetKey;
  readonly label: string | { readonly swatch: "red" | "black" };
  readonly wide: string;
  readonly narrow: string;
  readonly kind: "num" | "out";
  readonly side: boolean;
  readonly color: RouletteColor | null;
  readonly aria: string;
}

function buildBoard(): BoardCell[] {
  const cells: BoardCell[] = [];
  for (const n of NUMBERS) {
    if (n === 0) {
      cells.push({ key: "n0", label: "0", wide: "1 / 1 / 4 / 2", narrow: "1 / 3 / 2 / 6", kind: "num", side: false, color: "green", aria: "zero" });
      continue;
    }
    const col = Math.floor((n - 1) / 3);
    const row = (n - 1) % 3;
    const color = colorOf(n);
    cells.push({
      key: straightKey(n),
      label: String(n),
      wide: `${3 - row} / ${col + 2}`,
      narrow: `${col + 2} / ${3 + row}`,
      kind: "num",
      side: false,
      color,
      aria: `${n} ${color}, pays 35 to 1`,
    });
  }
  for (const x of [1, 2, 3] as const) {
    cells.push({
      key: `c${x}` as const,
      label: "2 to 1",
      wide: `${4 - x} / 14`,
      narrow: `14 / ${2 + x}`,
      kind: "out",
      side: false,
      color: null,
      aria: `column ${x}, pays 2 to 1`,
    });
  }
  for (const d of [1, 2, 3] as const) {
    const a = 2 + 4 * (d - 1);
    const key = `d${d}` as const;
    const name = OUTSIDE_NAMES[key];
    cells.push({
      key,
      label: name,
      wide: `4 / ${a} / 5 / ${a + 4}`,
      narrow: `${a} / 2 / ${a + 4} / 3`,
      kind: "out",
      side: true,
      color: null,
      aria: `${name}, pays 2 to 1`,
    });
  }
  const evenMoney: readonly [OutsideKey, BoardCell["label"]][] = [
    ["low", "1–18"],
    ["even", "Even"],
    ["red", { swatch: "red" }],
    ["black", { swatch: "black" }],
    ["odd", "Odd"],
    ["high", "19–36"],
  ];
  evenMoney.forEach(([key, label], j) => {
    const a = 2 + 2 * j;
    cells.push({
      key,
      label,
      wide: `5 / ${a} / 6 / ${a + 2}`,
      narrow: `${a} / 1 / ${a + 2} / 2`,
      kind: "out",
      side: true,
      color: null,
      aria: `${OUTSIDE_NAMES[key]}, pays 1 to 1`,
    });
  });
  return cells;
}

export const BOARD: readonly BoardCell[] = buildBoard();

function buildStrip(): RouletteResult[] {
  const pockets: RouletteResult[] = [];
  for (let lap = 0; lap < STRIP_REPEATS; lap++) {
    for (const n of WHEEL) pockets.push({ n, color: colorOf(n) });
  }
  return pockets;
}

export const STRIP: readonly RouletteResult[] = buildStrip();
