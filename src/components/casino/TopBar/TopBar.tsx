"use client";

import { Button } from "../../ui/Button";
import { useCashOut } from "../CashOutDialog";
import { SessionStats } from "../SessionStats";
import styles from "./TopBar.module.css";

export function TopBar() {
  const openCashOut = useCashOut();
  return (
    <header className={styles.topbar}>
      <div className={styles.brand}>House Money</div>
      <SessionStats />
      <Button primary onClick={openCashOut}>
        Cash out
      </Button>
    </header>
  );
}
