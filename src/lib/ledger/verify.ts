import { isStake, isWhole } from "@/lib/money/stake";
import { isFrozen } from "@/lib/security/trusted";
import { GENESIS } from "./seal";
import type { LedgerEntry, Signer } from "./types";

export interface ChainInput {
  readonly entries: readonly LedgerEntry[];
  readonly seals: readonly (string | undefined)[];
  readonly buyIn: number;
  readonly balance: number;
  readonly reserved: number;
  readonly sign: Signer | null;
}

export async function verifyChain(input: ChainInput): Promise<boolean> {
  const entries = input.entries;
  let ok = true;
  let balance = 0;
  let prev = GENESIS;
  for (let i = 0; i < entries.length; i++) {
    const e = entries[i];
    if (e === undefined) return false;
    if (!isFrozen(e) || e.seq !== i + 1) ok = false;
    if (i === 0 ? e.type !== "buyin" || e.net !== input.buyIn : e.type !== "bet") ok = false;
    if (!isWhole(e.net)) ok = false;
    balance = e.type === "buyin" ? e.net : balance + e.net;
    if (e.type === "bet" && (!isStake(e.wager) || e.net < -e.wager)) ok = false;
    if (e.balance !== balance) ok = false;
    if (input.sign) {
      const seal = input.seals[i];
      if (seal === undefined || (await input.sign(prev, e)) !== seal) ok = false;
      prev = seal ?? "";
    }
  }
  if (balance !== input.balance || input.reserved !== 0) ok = false;
  return ok;
}
