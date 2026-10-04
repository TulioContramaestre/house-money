"use client";

import { useRef, useState, type FormEvent } from "react";
import { checkAmount, parseAmount } from "@/lib/money/amount";
import { fmt } from "@/lib/money/format";
import { useRequireIdleSession } from "@/session/guards";
import { session } from "@/session/session";
import { Button } from "../../ui/Button";
import { AmountField } from "../AmountField";
import { CashierFrame } from "../CashierFrame";
import { QuickAmounts } from "../QuickAmounts";
import styles from "./BuyInScreen.module.css";

const DEFAULT_HINT = "Whole thousands. You can also type 400k or 1.5m.";

function validAmount(raw: string): number | null {
  const amount = parseAmount(raw);
  return Number.isFinite(amount) && !checkAmount(amount) ? amount : null;
}

function hintFor(raw: string): string {
  const amount = validAmount(raw.trim());
  return amount === null ? DEFAULT_HINT : `${fmt(amount)} in chips.`;
}

export function BuyInScreen() {
  const allowed = useRequireIdleSession();
  const input = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);

  const edit = (next: string) => {
    setValue(next);
    setError(null);
  };

  const tidy = () => {
    const amount = validAmount(value);
    if (amount !== null) setValue(fmt(amount));
  };

  const pick = (amount: number) => {
    edit(fmt(amount));
    input.current?.focus();
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const amount = parseAmount(value);
    const problem = checkAmount(amount);
    if (problem) {
      setError(problem);
      input.current?.focus();
      return;
    }
    void session.open(amount);
  };

  if (!allowed) return null;
  return (
    <CashierFrame lede="A practice casino with play money. Blackjack, baccarat, roulette and craps.">
      <form className={styles.form} noValidate onSubmit={submit}>
        <AmountField ref={input} value={value} hint={error ?? hintFor(value)} error={error !== null} onChange={edit} onBlur={tidy} />
        <QuickAmounts onPick={pick} />
        <Button primary type="submit" className={styles.submit}>
          Buy in
        </Button>
      </form>
      <p className={styles.fine}>Nothing is saved. Closing or refreshing the page ends the session.</p>
    </CashierFrame>
  );
}
