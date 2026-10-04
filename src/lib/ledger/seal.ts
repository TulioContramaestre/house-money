import { Bytes, encodeUtf8, hmacSign, itemAt, stringify } from "@/lib/security/trusted";
import type { LedgerEntry } from "./types";

export const GENESIS = "genesis";

const DIGITS = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "a", "b", "c", "d", "e", "f"];
const BYTE_HEX: string[] = [];
for (let hi = 0; hi < 16; hi++) {
  for (let lo = 0; lo < 16; lo++) BYTE_HEX[hi * 16 + lo] = itemAt(DIGITS, hi) + itemAt(DIGITS, lo);
}

export function toHex(bytes: Uint8Array): string {
  let hex = "";
  for (let i = 0; i < bytes.length; i++) hex += itemAt(BYTE_HEX, itemAt(bytes, i));
  return hex;
}

export async function sealEntry(key: CryptoKey, prev: string, e: LedgerEntry): Promise<string> {
  if (!hmacSign) throw new Error("Sealing needs crypto.subtle");
  const payload = stringify([e.seq, e.at, e.type, e.game, e.wager, e.net, e.balance, e.detail]);
  const signature = await hmacSign("HMAC", key, encodeUtf8(prev + "|" + payload));
  return toHex(new Bytes(signature));
}
