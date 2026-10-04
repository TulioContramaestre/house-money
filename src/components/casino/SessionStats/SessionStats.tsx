"use client";

import { useDomGuard } from "@/hooks/useDomGuard";
import { fmt, signed } from "@/lib/money/format";
import { useLedgerSnapshot } from "@/session/hooks";
import styles from "./SessionStats.module.css";

const STATS_GUARD: MutationObserverInit = { subtree: true, childList: true, characterData: true };

export function SessionStats() {
  const { cash, onTable, net } = useLedgerSnapshot();
  const { key, watch } = useDomGuard(STATS_GUARD);
  return (
    <dl key={key} ref={watch} className={styles.stats}>
      <div>
        <dt>Cash</dt>
        <dd>{fmt(cash)}</dd>
      </div>
      <div>
        <dt>On the table</dt>
        <dd>{fmt(onTable)}</dd>
      </div>
      <div>
        <dt>Session</dt>
        <dd className={net > 0 ? styles.pos : net < 0 ? styles.neg : undefined}>{signed(net)}</dd>
      </div>
    </dl>
  );
}
