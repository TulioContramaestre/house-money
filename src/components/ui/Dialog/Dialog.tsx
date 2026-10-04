import { useId, type ReactNode, type Ref } from "react";
import styles from "./Dialog.module.css";

interface DialogProps {
  readonly ref?: Ref<HTMLDialogElement>;
  readonly title: ReactNode;
  readonly children: ReactNode;
  readonly actions: ReactNode;
  readonly onClose?: (returnValue: string) => void;
}

export function Dialog({ ref, title, children, actions, onClose }: DialogProps) {
  const titleId = useId();
  return (
    <dialog
      ref={ref}
      className={styles.dialog}
      aria-labelledby={titleId}
      onClose={(event) => onClose?.(event.currentTarget.returnValue)}
    >
      <form method="dialog">
        <h2 id={titleId} className={styles.title}>
          {title}
        </h2>
        <p className={styles.body}>{children}</p>
        <div className={styles.row}>{actions}</div>
      </form>
    </dialog>
  );
}
