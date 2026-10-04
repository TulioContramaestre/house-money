import { beforeAll, describe, expect, test } from "vitest";
import { itemAt } from "@/lib/security/trusted";
import { SAMPLE_BUY_IN, SAMPLE_FINAL, SAMPLE_SESSION, entry } from "@/test/entries";
import { GENESIS, sealEntry, toHex } from "./seal";
import type { LedgerEntry, Signer } from "./types";
import { verifyChain, type ChainInput } from "./verify";

let sign: Signer;
const nth = (i: number) => itemAt(SAMPLE_SESSION, i);

beforeAll(async () => {
  const key = await crypto.subtle.generateKey({ name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  sign = (prev, e) => sealEntry(key, prev, e);
});

async function sealAll(entries: readonly LedgerEntry[]): Promise<string[]> {
  const seals: string[] = [];
  let prev = GENESIS;
  for (const e of entries) {
    prev = await sign(prev, e);
    seals.push(prev);
  }
  return seals;
}

function chain(overrides: Partial<ChainInput> = {}): ChainInput {
  return { entries: SAMPLE_SESSION, seals: [], buyIn: SAMPLE_BUY_IN, balance: SAMPLE_FINAL, reserved: 0, sign: null, ...overrides };
}

function replaceAt(list: readonly LedgerEntry[], index: number, next: LedgerEntry): LedgerEntry[] {
  return list.map((e, i) => (i === index ? next : e));
}

test("toHex writes two lowercase digits per byte", () => {
  expect(toHex(new Uint8Array([0, 9, 10, 255]))).toBe("00090aff");
});

describe("sealed chain", () => {
  test("passes for a clean session", async () => {
    const seals = await sealAll(SAMPLE_SESSION);
    expect(seals.every((s) => /^[0-9a-f]{64}$/.test(s))).toBe(true);
    expect(await verifyChain(chain({ seals, sign }))).toBe(true);
  });

  test("fails when one entry's text is altered after sealing", async () => {
    const seals = await sealAll(SAMPLE_SESSION);
    const tampered = replaceAt(SAMPLE_SESSION, 2, entry({ ...nth(2), seq: 3, detail: "Landed 7 red. Paid: red." }));
    expect(await verifyChain(chain({ entries: tampered, seals, sign }))).toBe(false);
  });

  test("fails when a result is rewritten with consistent arithmetic", async () => {
    const seals = await sealAll(SAMPLE_SESSION);
    const rewritten = SAMPLE_SESSION.map((e) =>
      e.seq === 3 ? entry({ ...e, net: 10_000, balance: 117_500 }) : e.seq > 3 ? entry({ ...e, balance: e.balance + 20_000 }) : e,
    );
    expect(await verifyChain(chain({ entries: rewritten, balance: SAMPLE_FINAL + 20_000 }))).toBe(true);
    expect(await verifyChain(chain({ entries: rewritten, balance: SAMPLE_FINAL + 20_000, seals, sign }))).toBe(false);
  });

  test("fails when a seal is missing or swapped", async () => {
    const seals = await sealAll(SAMPLE_SESSION);
    expect(await verifyChain(chain({ seals: seals.slice(0, -1), sign }))).toBe(false);
    const swapped = [...seals];
    [swapped[1], swapped[2]] = [itemAt(seals, 2), itemAt(seals, 1)];
    expect(await verifyChain(chain({ seals: swapped, sign }))).toBe(false);
  });

  test("fails against a different key", async () => {
    const seals = await sealAll(SAMPLE_SESSION);
    const otherKey = await crypto.subtle.generateKey({ name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    const otherSign: Signer = (prev, e) => sealEntry(otherKey, prev, e);
    expect(await verifyChain(chain({ seals, sign: otherSign }))).toBe(false);
  });
});

describe("arithmetic replay", () => {
  test("passes for a clean session without seals", async () => {
    expect(await verifyChain(chain())).toBe(true);
  });

  test("cannot see text edits without seals", async () => {
    const tampered = replaceAt(SAMPLE_SESSION, 1, entry({ ...nth(1), detail: "Edited." }));
    expect(await verifyChain(chain({ entries: tampered }))).toBe(true);
  });

  test("fails when a balance doesn't follow from the nets", async () => {
    const tampered = replaceAt(SAMPLE_SESSION, 3, entry({ ...nth(3), balance: 197_500 }));
    expect(await verifyChain(chain({ entries: tampered }))).toBe(false);
  });

  test("fails when the final balance disagrees", async () => {
    expect(await verifyChain(chain({ balance: SAMPLE_FINAL + 1000 }))).toBe(false);
  });

  test("fails while chips are still on the table", async () => {
    expect(await verifyChain(chain({ reserved: 5000 }))).toBe(false);
  });

  test("fails on an unfrozen entry", async () => {
    const thawed = replaceAt(SAMPLE_SESSION, 1, { ...nth(1) });
    expect(await verifyChain(chain({ entries: thawed }))).toBe(false);
  });

  test("fails on a gap or reordering in the sequence", async () => {
    expect(await verifyChain(chain({ entries: SAMPLE_SESSION.filter((e) => e.seq !== 4), balance: SAMPLE_FINAL }))).toBe(false);
    const reordered = [nth(0), nth(2), nth(1), ...SAMPLE_SESSION.slice(3)];
    expect(await verifyChain(chain({ entries: reordered }))).toBe(false);
  });

  test("fails unless the first entry is the buy-in", async () => {
    expect(await verifyChain(chain({ buyIn: 200_000 }))).toBe(false);
    const noBuyIn = replaceAt(SAMPLE_SESSION, 0, entry({ ...nth(0), type: "bet" }));
    expect(await verifyChain(chain({ entries: noBuyIn }))).toBe(false);
  });

  test("fails on a second buy-in", async () => {
    const twice = replaceAt(SAMPLE_SESSION, 1, entry({ ...nth(1), type: "buyin" }));
    expect(await verifyChain(chain({ entries: twice }))).toBe(false);
  });

  test("fails on impossible bets", async () => {
    const overLoss = replaceAt(SAMPLE_SESSION, 2, entry({ ...nth(2), net: -20_000, balance: 87_500 }));
    expect(await verifyChain(chain({ entries: overLoss.slice(0, 3), balance: 87_500 }))).toBe(false);
    const oddWager = replaceAt(SAMPLE_SESSION, 1, entry({ ...nth(1), wager: 5500 }));
    expect(await verifyChain(chain({ entries: oddWager }))).toBe(false);
    const fraction = replaceAt(SAMPLE_SESSION, 1, entry({ ...nth(1), net: 7500.5, balance: 107_500.5 }));
    expect(await verifyChain(chain({ entries: fraction.slice(0, 2), balance: 107_500.5 }))).toBe(false);
  });
});
