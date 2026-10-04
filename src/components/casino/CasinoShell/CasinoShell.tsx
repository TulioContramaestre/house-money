"use client";

import { useCallback, useRef, type ReactNode } from "react";
import { useRequireOpenSession } from "@/session/guards";
import { session } from "@/session/session";
import { SessionLog } from "../../log/SessionLog";
import { CashOutContext, CashOutDialog } from "../CashOutDialog";
import { GameTabs } from "../GameTabs";
import { TopBar } from "../TopBar";
import styles from "./CasinoShell.module.css";

export function CasinoShell({ children }: { readonly children: ReactNode }) {
  const allowed = useRequireOpenSession();
  const dialog = useRef<HTMLDialogElement>(null);

  const openCashOut = useCallback(() => {
    const element = dialog.current;
    if (!element || !session.requestCashOut()) return;
    element.returnValue = "";
    element.showModal();
  }, []);

  if (!allowed) return null;
  return (
    <CashOutContext value={openCashOut}>
      <div className={styles.casino}>
        <TopBar />
        <section className={styles.play}>
          <GameTabs />
          {children}
        </section>
        <SessionLog />
      </div>
      <CashOutDialog ref={dialog} />
    </CashOutContext>
  );
}
