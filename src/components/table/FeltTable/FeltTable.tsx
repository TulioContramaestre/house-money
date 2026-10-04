import type { ReactNode } from "react";
import styles from "./FeltTable.module.css";

export function FeltTable({ children }: { readonly children: ReactNode }) {
  return <div className={styles.table}>{children}</div>;
}
