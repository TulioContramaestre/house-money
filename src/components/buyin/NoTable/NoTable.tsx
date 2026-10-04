import Link from "next/link";
import { CashierFrame } from "../CashierFrame";
import styles from "./NoTable.module.css";

export function NoTable() {
  return (
    <CashierFrame lede="There's no table here.">
      <Link href="/" className={styles.link}>
        Go to the cashier
      </Link>
    </CashierFrame>
  );
}
