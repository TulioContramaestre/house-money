import { expect, test } from "vitest";
import type { LedgerEntry } from "@/lib/ledger/types";
import { fmt } from "@/lib/money/format";
import { SAMPLE_BUY_IN, SAMPLE_FINAL, SAMPLE_SESSION } from "@/test/entries";
import { receiptFileName, receiptPlainText, type ReceiptClock } from "./plainText";
import { buildReceipt } from "./summary";

const clock: ReceiptClock = {
  dateTime: () => "Oct 2, 2026, 1:00 PM",
  clock: () => "2:30 PM",
  time: (ms) => `t+${(ms - 1_700_000_000_000) / 60_000}m`,
};

/** The reference's buildReceipt text code, copied as written, as an independent oracle. */
function referenceText(list: readonly LedgerEntry[], buyIn: number, final: number, checkText: string): string {
  const bets = list.filter((e) => e.type === "bet");
  const net = final - buyIn;
  const won = bets.filter((e) => e.net > 0).length, lost = bets.filter((e) => e.net < 0).length, pushed = bets.length - won - lost;
  const wagered = bets.reduce((s, e) => s + e.wager, 0);
  const byGame = new Map<string, { n: number; net: number }>();
  for (const e of bets) { const g = byGame.get(e.game) || { n: 0, net: 0 }; g.n++; g.net += e.net; byGame.set(e.game, g); }
  const pad = (s: string | number, n: number) => String(s).padEnd(n);
  const lpad = (s: string | number, n: number) => String(s).padStart(n);
  const plain = (n: number) => (n > 0 ? "+" + fmt(n) : n < 0 ? "-" + fmt(-n) : "0");
  const lines = [
    "HOUSE MONEY - CASH-OUT RECEIPT",
    `${clock.dateTime(0)} to ${clock.clock(0)}`,
    "",
    `Bought in    ${lpad(fmt(buyIn), 16)}`,
    `Cashing out  ${lpad(fmt(final), 16)}`,
    `Net result   ${lpad(plain(net), 16)}`,
    "",
    `Rounds ${bets.length}  (won ${won}, lost ${lost}, pushed ${pushed})   Total wagered ${fmt(wagered)}`,
    ...[...byGame].map(([g, v]) => `  ${pad(g, 10)} ${lpad(v.n, 4)} rounds ${lpad(plain(v.net), 14)}`),
    "",
    "FULL LOG",
    ...list.map((e) => `#${pad(e.seq, 4)} ${pad(clock.time(e.at), 12)} ${pad(e.game, 10)} ${e.type === "buyin" ? pad("buy-in", 14) : pad("bet " + fmt(e.wager), 14)} ${lpad(e.type === "buyin" ? "+" + fmt(e.net) : plain(e.net), 13)}  bal ${lpad(fmt(e.balance), 13)}${e.type === "bet" ? "  " + e.detail : ""}`),
    "",
    `FINAL TOTAL  ${lpad(fmt(final), 16)}`,
    checkText,
  ];
  return lines.join("\n");
}

const receipt = buildReceipt({
  entries: SAMPLE_SESSION,
  buyIn: SAMPLE_BUY_IN,
  final: SAMPLE_FINAL,
  startedAt: 0,
  endedAt: 0,
  check: { ok: true, sealed: true, count: 5 },
});
const text = receiptPlainText(receipt, clock);

test("matches the reference format line for line", () => {
  expect(text).toBe(referenceText(SAMPLE_SESSION, SAMPLE_BUY_IN, SAMPLE_FINAL, receipt.checkText));
});

test("spot-check of the layout", () => {
  const lines = text.split("\n");
  expect(lines.slice(0, 8)).toEqual([
    "HOUSE MONEY - CASH-OUT RECEIPT",
    "Oct 2, 2026, 1:00 PM to 2:30 PM",
    "",
    "Bought in             100,000",
    "Cashing out            99,500",
    "Net result               -500",
    "",
    "Rounds 4  (won 2, lost 1, pushed 1)   Total wagered 22,000",
  ]);
  expect(lines).toContain("  Roulette      1 rounds        -10,000");
  expect(lines).toContain("#1    t+1m         Cashier    buy-in              +100,000  bal       100,000");
  expect(lines).toContain(
    "#3    t+3m         Roulette   bet 10,000           -10,000  bal        97,500  Landed 0 green. Lost: red.",
  );
  expect(lines.at(-2)).toBe("FINAL TOTAL            99,500");
  expect(lines.at(-1)).toBe("Ledger check passed: 5 entries replayed, every balance and seal matches.");
});

test("names the file by the UTC date", () => {
  expect(receiptFileName(new Date("2026-10-02T23:30:00Z"))).toBe("house-money-receipt-2026-10-02.txt");
});
