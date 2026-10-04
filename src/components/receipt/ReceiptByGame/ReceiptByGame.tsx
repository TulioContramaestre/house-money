import { signed } from "@/lib/money/format";
import type { ReceiptGameLine } from "@/lib/receipt/summary";
import { ReceiptRows } from "../ReceiptRows";

export function ReceiptByGame({ lines }: { readonly lines: readonly ReceiptGameLine[] }) {
  if (!lines.length) return null;
  return (
    <>
      <h3>By game</h3>
      <ReceiptRows
        rows={lines.map((line) => ({
          label: `${line.game}, ${line.rounds} ${line.rounds === 1 ? "round" : "rounds"}`,
          value: signed(line.net),
        }))}
      />
    </>
  );
}
