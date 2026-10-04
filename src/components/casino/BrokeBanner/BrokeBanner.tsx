"use client";

import { useLedgerSnapshot } from "@/session/hooks";
import { Button } from "../../ui/Button";
import { useCashOut } from "../CashOutDialog";
import styles from "./BrokeBanner.module.css";

export function BrokeBanner() {
  const { broke } = useLedgerSnapshot();
  const openCashOut = useCashOut();
  if (!broke) return null;
  return (
    <div className={styles.broke}>
      <span>You&apos;re out of chips. Cash out to see how the session went.</span>
      <Button primary onClick={openCashOut}>
        Cash out
      </Button>
    </div>
  );
}
