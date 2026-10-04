import type { ReactNode } from "react";
import type { ChipClass } from "@/lib/money/chips";
import { cx } from "../../cx";
import styles from "./ChipFace.module.css";

export type ChipSize = "rack" | "stake" | "stakeLarge" | "stakeSmall";

interface ChipFaceProps {
  readonly cls: ChipClass;
  readonly size: ChipSize;
  readonly label?: string;
  readonly className?: string;
  readonly children: ReactNode;
}

export function ChipFace({ cls, size, label, className, children }: ChipFaceProps) {
  return (
    <span className={cx(styles.face, styles[size], styles[cls], className)} aria-label={label}>
      {children}
    </span>
  );
}
