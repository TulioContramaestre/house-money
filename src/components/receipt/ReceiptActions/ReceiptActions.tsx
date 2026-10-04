"use client";

import { receiptFileName } from "@/lib/receipt/plainText";
import { Button } from "../../ui/Button";
import styles from "./ReceiptActions.module.css";

function download(text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: "text/plain" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = receiptFileName(new Date());
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

function startOver() {
  // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- a full load is what wipes the in-memory session
  window.location.assign("/");
}

export function ReceiptActions({ text }: { readonly text: string }) {
  return (
    <div className={styles.actions}>
      <Button onClick={() => window.print()}>Print or save as PDF</Button>
      <Button onClick={() => download(text)}>Download as text</Button>
      <Button primary onClick={startOver}>
        Start a new session
      </Button>
    </div>
  );
}
