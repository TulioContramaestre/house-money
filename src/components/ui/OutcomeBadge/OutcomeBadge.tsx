import { signed } from "@/lib/money/format";
import { cx } from "../../cx";
import styles from "./OutcomeBadge.module.css";

interface OutcomeBadgeProps {
  readonly net: number;
  readonly label?: string;
}

export function OutcomeBadge({ net, label }: OutcomeBadgeProps) {
  const tone = net > 0 ? styles.win : net < 0 ? styles.loss : styles.push;
  const text = `${label ? `${label} ` : ""}${net ? signed(net) : label ? "" : "Push"}`;
  return <span className={cx(styles.outcome, tone)}>{text}</span>;
}
