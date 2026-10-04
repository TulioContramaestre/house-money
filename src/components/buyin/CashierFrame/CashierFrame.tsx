import type { ReactNode } from "react";
import styles from "./CashierFrame.module.css";

interface CashierFrameProps {
  readonly lede: string;
  readonly children: ReactNode;
}

export function CashierFrame({ lede, children }: CashierFrameProps) {
  return (
    <main className={styles.buyin}>
      <div className={styles.card}>
        <h1 className={styles.brand}>
          House
          <br />
          Money
        </h1>
        <p className={styles.lede}>{lede}</p>
        {children}
      </div>
    </main>
  );
}
