import { expect, test } from "@playwright/test";
import { button, buyIn, expectLedgerAddsUp, logCount, openGame, playRound, topLogDetail } from "./helpers";

const DETAIL = /^Landed \d+ (red|black|green)\.( Paid: [^.]+\.)?( Lost: [^.]+\.)?$/;
const CELLS = ["17 black, pays 35 to 1", "red, pays 1 to 1", "2nd 12, pays 2 to 1", "column 3, pays 2 to 1", "odd, pays 1 to 1"];

test("ten spins of roulette keep the log, the history and the header in step", async ({ page }) => {
  await buyIn(page);
  await openGame(page, "Roulette");
  for (let round = 0; round < 10; round++) {
    await playRound(page, async () => {
      if (round % 4 === 3) {
        await button(page, /^Spin [\d,]+ again$/).click();
        return;
      }
      await page.getByRole("button", { name: `Bet on ${CELLS[round % CELLS.length]}` }).click();
      await page.getByRole("button", { name: "Bet on zero" }).click();
      await button(page, "Spin").click();
    });
    await expect(page.getByLabel(/^Last result \d+$/)).toBeVisible();
    expect(await topLogDetail(page)).toMatch(DETAIL);
    await expectLedgerAddsUp(page);
  }
  await expect(page.getByLabel("Recent numbers").getByRole("listitem")).toHaveCount(10);
  expect(await logCount(page)).toBe(11);
});

test("undo and clear give the chips back before the spin", async ({ page }) => {
  await buyIn(page);
  await openGame(page, "Roulette");
  await page.getByRole("button", { name: "Bet on red, pays 1 to 1" }).click();
  await page.getByRole("button", { name: "Bet on 1st 12, pays 2 to 1" }).click();
  await expect(page.getByText("10,000 on the layout.", { exact: false })).toBeVisible();
  await button(page, "Undo").click();
  await expect(page.locator("section p[aria-live]")).toHaveText("5,000 on the layout.");
  await button(page, "Clear").click();
  await expect(page.locator("section p[aria-live]")).toHaveText("Bets cleared.");
  await expectLedgerAddsUp(page);
  expect(await logCount(page)).toBe(1);
});
