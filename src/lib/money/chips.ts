export type ChipClass = "c1" | "c5" | "c25" | "c100" | "c500" | "c1m";

export interface ChipDenomination {
  readonly value: number;
  readonly cls: ChipClass;
}

export const CHIPS: readonly ChipDenomination[] = [
  { value: 1000, cls: "c1" },
  { value: 5000, cls: "c5" },
  { value: 25000, cls: "c25" },
  { value: 100000, cls: "c100" },
  { value: 500000, cls: "c500" },
  { value: 1000000, cls: "c1m" },
];

export const DEFAULT_CHIP = 5000;

export function chipClass(amount: number): ChipClass {
  let cls: ChipClass = "c1";
  for (const chip of CHIPS) if (amount >= chip.value) cls = chip.cls;
  return cls;
}

export function isChipValue(value: number): boolean {
  return CHIPS.some((chip) => chip.value === value);
}

export function largestAffordableChip(available: number): number | null {
  let fit: number | null = null;
  for (const chip of CHIPS) if (chip.value <= available) fit = chip.value;
  return fit;
}
