import type { ReactNode } from "react";
import { cx } from "../../cx";
import styles from "./Button.module.css";

interface ButtonProps {
  readonly children: ReactNode;
  readonly onClick?: () => void;
  readonly primary?: boolean;
  readonly disabled?: boolean;
  readonly type?: "button" | "submit";
  readonly value?: string;
  readonly className?: string;
}

export function Button({ children, onClick, primary = false, disabled = false, type = "button", value, className }: ButtonProps) {
  return (
    <button
      type={type}
      value={value}
      className={cx(styles.btn, primary && styles.primary, className)}
      aria-disabled={disabled || undefined}
      onClick={disabled ? undefined : onClick}
    >
      {children}
    </button>
  );
}
