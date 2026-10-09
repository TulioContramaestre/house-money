"use client";

import { useRef, type ReactNode } from "react";
import { Button } from "../../ui/Button";
import { Dialog } from "../../ui/Dialog";
import styles from "./RulesButton.module.css";

interface RulesButtonProps {
  readonly game: string;
  readonly children: ReactNode;
}

export function RulesButton({ game, children }: RulesButtonProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  const rules = useRef<HTMLDivElement>(null);
  const open = () => {
    const element = dialog.current;
    if (!element) return;
    element.showModal();
    rules.current?.focus({ preventScroll: true });
  };
  const title = `How to play ${game}`;
  return (
    <>
      <button
        type="button"
        className={styles.icon}
        aria-label={title}
        aria-haspopup="dialog"
        onClick={open}
      >
        ?
      </button>
      <Dialog
        ref={dialog}
        title={title}
        wide
        dismissible
        actions={
          <Button type="submit" value="close" primary>
            Got it
          </Button>
        }
      >
        <div ref={rules} className={styles.rules} tabIndex={-1}>
          {children}
        </div>
      </Dialog>
    </>
  );
}
