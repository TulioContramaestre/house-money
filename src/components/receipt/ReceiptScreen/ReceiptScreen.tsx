"use client";

import { useRequireClosedSession } from "@/session/guards";
import { useReceipt } from "@/session/hooks";
import { ReceiptActions } from "../ReceiptActions";
import { ReceiptPaper } from "../ReceiptPaper";
import styles from "./ReceiptScreen.module.css";

export function ReceiptScreen() {
  const allowed = useRequireClosedSession();
  const receipt = useReceipt();
  if (!allowed || !receipt) return null;
  return (
    <main className={styles.wrap}>
      <ReceiptPaper data={receipt.data} />
      <ReceiptActions text={receipt.text} />
    </main>
  );
}
