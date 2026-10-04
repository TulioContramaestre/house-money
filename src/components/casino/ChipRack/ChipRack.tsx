"use client";

import { fmt, short } from "@/lib/money/format";
import { useChip } from "@/session/hooks";
import { session } from "@/session/session";
import { ChipFace } from "../../ui/ChipFace";
import styles from "./ChipRack.module.css";

export function ChipRack() {
  const { selected, chips } = useChip();
  return (
    <div className={styles.chips} role="group" aria-label="Chip value">
      {chips.map((chip) => (
        <button
          key={chip.value}
          type="button"
          className={styles.chip}
          aria-pressed={chip.value === selected}
          aria-label={`${fmt(chip.value)} chip`}
          disabled={chip.disabled}
          onClick={() => session.selectChip(chip.value)}
        >
          <ChipFace cls={chip.cls} size="rack">
            {short(chip.value)}
          </ChipFace>
        </button>
      ))}
    </div>
  );
}
