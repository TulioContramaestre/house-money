"use client";

import { useId, useRef, type MouseEvent, type ReactNode, type Ref } from "react";
import { cx } from "../../cx";
import styles from "./Dialog.module.css";

interface DialogProps {
  readonly ref?: Ref<HTMLDialogElement>;
  readonly title: ReactNode;
  readonly children: ReactNode;
  readonly actions: ReactNode;
  readonly onClose?: (returnValue: string) => void;
  readonly wide?: boolean;
  readonly dismissible?: boolean;
}

function isOutside(event: MouseEvent<HTMLDialogElement>): boolean {
  const box = event.currentTarget.getBoundingClientRect();
  return event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom;
}

export function Dialog({ ref, title, children, actions, onClose, wide = false, dismissible = false }: DialogProps) {
  const titleId = useId();
  const pressedOutside = useRef(false);
  return (
    <dialog
      ref={ref}
      className={cx(styles.dialog, wide && styles.wide)}
      aria-labelledby={titleId}
      onClose={(event) => onClose?.(event.currentTarget.returnValue)}
      onPointerDown={(event) => {
        pressedOutside.current = dismissible && isOutside(event);
      }}
      onClick={(event) => {
        if (pressedOutside.current && event.target === event.currentTarget && isOutside(event)) event.currentTarget.close();
      }}
    >
      <form method="dialog">
        <div className={styles.head}>
          <h2 id={titleId} className={styles.title}>
            {title}
          </h2>
          {dismissible && (
            <button type="submit" value="close" className={styles.close} aria-label="Close">
              ×
            </button>
          )}
        </div>
        <div className={styles.body}>{children}</div>
        <div className={styles.row}>{actions}</div>
      </form>
    </dialog>
  );
}
