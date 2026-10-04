import styles from "./MessageLine.module.css";

export function MessageLine({ message }: { readonly message: string }) {
  return (
    <p className={styles.msg} aria-live="polite">
      {message}
    </p>
  );
}
