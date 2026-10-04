import type { ReactNode } from "react";
import styles from "./TotalPill.module.css";

export function TotalPill({ children }: { readonly children: ReactNode }) {
  return <span className={styles.total}>{children}</span>;
}
