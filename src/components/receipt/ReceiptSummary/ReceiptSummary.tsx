import { fmt, signed } from "@/lib/money/format";
import type { ReceiptData, ReceiptHighlight } from "@/lib/receipt/summary";
import { ReceiptRows } from "../ReceiptRows";

const highlight = (h: ReceiptHighlight | null) => (h ? `${signed(h.net)} ${h.game}` : "None");

export function ReceiptSummary({ data }: { readonly data: ReceiptData }) {
  return (
    <>
      <ReceiptRows
        rows={[
          { label: "Bought in", value: fmt(data.buyIn) },
          { label: "Cashing out", value: fmt(data.final) },
          { label: "Net result", value: signed(data.net), net: data.net },
        ]}
      />
      <h3>Session</h3>
      <ReceiptRows
        rows={[
          { label: "Rounds played", value: fmt(data.rounds) },
          { label: "Won, lost, pushed", value: `${data.won}, ${data.lost}, ${data.pushed}` },
          { label: "Total wagered", value: fmt(data.wagered) },
          { label: "Biggest win", value: highlight(data.best) },
          { label: "Biggest loss", value: highlight(data.worst) },
        ]}
      />
    </>
  );
}
