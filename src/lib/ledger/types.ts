export type EntryType = "buyin" | "bet";

export interface LedgerEntry {
  readonly seq: number;
  readonly at: number;
  readonly type: EntryType;
  readonly game: string;
  readonly wager: number;
  readonly net: number;
  readonly balance: number;
  readonly detail: string;
}

export interface VerifyResult {
  readonly ok: boolean;
  readonly sealed: boolean;
  readonly count: number;
}

export type Signer = (prev: string, entry: LedgerEntry) => Promise<string>;
