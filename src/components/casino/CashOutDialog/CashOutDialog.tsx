"use client";

import type { Ref } from "react";
import { fmt } from "@/lib/money/format";
import { useLedgerSnapshot } from "@/session/hooks";
import { session } from "@/session/session";
import { Button } from "../../ui/Button";
import { Dialog } from "../../ui/Dialog";

export function CashOutDialog({ ref }: { readonly ref?: Ref<HTMLDialogElement> }) {
  const { balance } = useLedgerSnapshot();
  const onClose = (returnValue: string) => {
    if (returnValue === "ok") void session.confirmCashOut();
  };
  return (
    <Dialog
      ref={ref}
      title={`Cash out ${fmt(balance)}?`}
      onClose={onClose}
      actions={
        <>
          <Button type="submit" value="cancel">
            Keep playing
          </Button>
          <Button type="submit" value="ok" primary>
            Cash out
          </Button>
        </>
      }
    >
      This ends the session and prints your receipt. Nothing is kept after you leave the page.
    </Dialog>
  );
}
