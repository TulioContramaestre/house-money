import { fmt } from "@/lib/money/format";
import { formatClock, formatDateTime, formatTime } from "@/lib/timing/clock";
import type { ReceiptData } from "./summary";

export interface ReceiptClock {
  readonly dateTime: (ms: number) => string;
  readonly clock: (ms: number) => string;
  readonly time: (ms: number) => string;
}

const localClock: ReceiptClock = { dateTime: formatDateTime, clock: formatClock, time: formatTime };

const pad = (value: string | number, width: number) => String(value).padEnd(width);
const lpad = (value: string | number, width: number) => String(value).padStart(width);
const plain = (n: number) => (n > 0 ? `+${fmt(n)}` : n < 0 ? `-${fmt(-n)}` : "0");

export function receiptPlainText(r: ReceiptData, clock: ReceiptClock = localClock): string {
  const lines = [
    "HOUSE MONEY - CASH-OUT RECEIPT",
    `${clock.dateTime(r.startedAt)} to ${clock.clock(r.endedAt)}`,
    "",
    `Bought in    ${lpad(fmt(r.buyIn), 16)}`,
    `Cashing out  ${lpad(fmt(r.final), 16)}`,
    `Net result   ${lpad(plain(r.net), 16)}`,
    "",
    `Rounds ${r.rounds}  (won ${r.won}, lost ${r.lost}, pushed ${r.pushed})   Total wagered ${fmt(r.wagered)}`,
    ...r.byGame.map((g) => `  ${pad(g.game, 10)} ${lpad(g.rounds, 4)} rounds ${lpad(plain(g.net), 14)}`),
    "",
    "FULL LOG",
    ...r.entries.map((e) => {
      const kind = e.type === "buyin" ? pad("buy-in", 14) : pad(`bet ${fmt(e.wager)}`, 14);
      const net = lpad(e.type === "buyin" ? `+${fmt(e.net)}` : plain(e.net), 13);
      const detail = e.type === "bet" ? `  ${e.detail}` : "";
      return `#${pad(e.seq, 4)} ${pad(clock.time(e.at), 12)} ${pad(e.game, 10)} ${kind} ${net}  bal ${lpad(fmt(e.balance), 13)}${detail}`;
    }),
    "",
    `FINAL TOTAL  ${lpad(fmt(r.final), 16)}`,
    r.checkText,
  ];
  return lines.join("\n");
}

export function receiptFileName(date: Date): string {
  return `house-money-receipt-${date.toISOString().slice(0, 10)}.txt`;
}
