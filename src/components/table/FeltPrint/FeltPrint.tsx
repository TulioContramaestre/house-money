import type { ReactNode } from "react";
import styles from "./FeltPrint.module.css";

export function FeltPrint({ children }: { readonly children: ReactNode }) {
  return <p className={styles.print}>{children}</p>;
}
