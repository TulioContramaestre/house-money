import { isStake, isWhole } from "@/lib/money/stake";
import { freeze, generateKey, itemAt, now } from "@/lib/security/trusted";
import { GENESIS, sealEntry } from "./seal";
import type { EntryType, LedgerEntry, Signer, VerifyResult } from "./types";
import { verifyChain } from "./verify";

export class Ledger {
  #balance = 0;
  #reserved = 0;
  #buyIn = 0;
  #started = 0;
  #open = false;
  #opening = false;
  #entries: LedgerEntry[] = [];
  #seals: (string | undefined)[] = [];
  #sign: Signer | null = null;
  #queue: Promise<void> = Promise.resolve();
  readonly #onChange: () => void;

  constructor(onChange: () => void = () => {}) {
    this.#onChange = onChange;
  }

  async open(buyIn: number): Promise<void> {
    if (this.#opening || this.#entries.length) throw new Error("Session already started");
    if (!isStake(buyIn)) throw new Error("Buy-in must be whole thousands");
    this.#opening = true;
    if (generateKey) {
      try {
        const key = await generateKey({ name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
        this.#sign = (prev, entry) => sealEntry(key, prev, entry);
      } catch {
        this.#sign = null;
      }
    }
    this.#buyIn = buyIn;
    this.#started = now();
    this.#open = true;
    this.#balance = buyIn;
    this.#append("buyin", "Cashier", 0, buyIn, "Chips purchased.");
  }

  get isOpen(): boolean {
    return this.#open;
  }
  get balance(): number {
    return this.#balance;
  }
  get reserved(): number {
    return this.#reserved;
  }
  get available(): number {
    return this.#balance - this.#reserved;
  }
  get buyIn(): number {
    return this.#buyIn;
  }
  get startedAt(): number {
    return this.#started;
  }

  reserve(amount: number): boolean {
    if (!this.#open || !isStake(amount) || amount > this.available) return false;
    this.#reserved += amount;
    this.#onChange();
    return true;
  }

  release(amount: number): boolean {
    if (!this.#open || !isStake(amount) || amount > this.#reserved) return false;
    this.#reserved -= amount;
    this.#onChange();
    return true;
  }

  settle(game: string, wager: number, net: number, detail: string): LedgerEntry {
    if (!this.#open) throw new Error("Session closed");
    if (!isStake(wager) || wager > this.#reserved) throw new Error("Invalid wager");
    if (!isWhole(net) || net < -wager) throw new Error("Invalid result");
    this.#reserved -= wager;
    this.#balance += net;
    return this.#append("bet", game, wager, net, detail);
  }

  entries(): LedgerEntry[] {
    const copy: LedgerEntry[] = [];
    for (let i = 0; i < this.#entries.length; i++) copy[i] = itemAt(this.#entries, i);
    return copy;
  }

  close(): void {
    this.#open = false;
  }

  async verify(): Promise<VerifyResult> {
    await this.#queue;
    const ok = await verifyChain({
      entries: this.#entries,
      seals: this.#seals,
      buyIn: this.#buyIn,
      balance: this.#balance,
      reserved: this.#reserved,
      sign: this.#sign,
    });
    return freeze({ ok, sealed: this.#sign !== null, count: this.#entries.length });
  }

  #append(type: EntryType, game: string, wager: number, net: number, detail: string): LedgerEntry {
    const i = this.#entries.length;
    const entry: LedgerEntry = freeze({
      seq: i + 1,
      at: now(),
      type,
      game,
      wager,
      net,
      balance: this.#balance,
      detail: `${detail}`,
    });
    this.#entries[i] = entry;
    const sign = this.#sign;
    if (sign) {
      const prior = this.#queue;
      this.#queue = (async () => {
        await prior;
        this.#seals[i] = await sign(i ? (this.#seals[i - 1] ?? "") : GENESIS, entry);
      })();
    }
    this.#onChange();
    return entry;
  }
}
