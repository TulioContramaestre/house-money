import { expect, test } from "@playwright/test";
import { blackjackRound, buyIn, expectLedgerAddsUp, logCount, topLogDetail } from "./helpers";

const HAND = String.raw`(blackjack|\d+(, bust)?)`;
const DETAIL = new RegExp(String.raw`^You: ${HAND}\. Dealer: ${HAND}\. (Win|Lose|Push)\.$`);

test("ten hands of blackjack keep the log and the header in step", async ({ page }) => {
  await buyIn(page);
  for (let round = 0; round < 10; round++) {
    await blackjackRound(page, round % 2 === 1);
    expect(await topLogDetail(page)).toMatch(DETAIL);
    await expectLedgerAddsUp(page);
  }
  expect(await logCount(page)).toBe(11);
});
