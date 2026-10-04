import { useId, type Ref } from "react";
import { cx } from "../../cx";
import styles from "./AmountField.module.css";

interface AmountFieldProps {
  readonly value: string;
  readonly hint: string;
  readonly error: boolean;
  readonly onChange: (value: string) => void;
  readonly onBlur: () => void;
  readonly ref: Ref<HTMLInputElement>;
}

export function AmountField({ value, hint, error, onChange, onBlur, ref }: AmountFieldProps) {
  const id = useId();
  const hintId = `${id}-hint`;
  return (
    <>
      <label htmlFor={id} className={styles.label}>
        How much are you bringing to the table?
      </label>
      <div className={styles.amount}>
        <input
          ref={ref}
          id={id}
          className={styles.input}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onBlur={onBlur}
          inputMode="decimal"
          autoComplete="off"
          spellCheck={false}
          placeholder="400,000"
          aria-describedby={hintId}
        />
      </div>
      <p id={hintId} className={cx(styles.hint, error && styles.err)} aria-live="polite">
        {hint}
      </p>
    </>
  );
}
