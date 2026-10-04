import type { ReactNode } from "react";
import styles from "./ActionBar.module.css";

export function ActionBar({ children }: { readonly children: ReactNode }) {
  return <div className={styles.actions}>{children}</div>;
}
