import { readFile } from "node:fs/promises";
import { expect, test, type Page } from "@playwright/test";
import {
  amountInput,
  blackjackRound,
  button,
  buyIn,
  logCount,
  openGame,
  playRound,
  readStats,
  topBar,
} from "./helpers";

const fmt = (n: number) => new Intl.NumberFormat("en-US").format(n);
const signed = (n: number) => (n > 0 ? `+${fmt(n)}` : n < 0 ? `−${fmt(-n)}` : "0");
const receiptRow = (page: Page, label: string) =>
  page.locator("article dt", { hasText: new RegExp(`^${label}$`) }).locator("xpath=following-sibling::dd[1]");

async function playSomeRounds(page: Page) {
  for (let round = 0; round < 3; round++) await blackjackRound(page, round > 0);
  await openGame(page, "Roulette");
  for (let round = 0; round < 2; round++) {
    await playRound(page, async () => {
      await page.getByRole("button", { name: "Bet on black, pays 1 to 1" }).click();
      await button(page, "Spin").click();
    });
  }
  await page.getByRole("button", { name: "Bet on even, pays 1 to 1" }).click();
}

test("cashing out verifies the ledger and prints a receipt that matches the header", async ({ page }) => {
  await buyIn(page);
  await playSomeRounds(page);
  const { cash, onTable } = await readStats(page);
  const total = cash + onTable;
  const entries = await logCount(page);

  await button(topBar(page), "Cash out").click();
  const dialog = page.getByRole("dialog", { name: `Cash out ${fmt(total)}?` });
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText("This ends the session and prints your receipt. Nothing is kept after you leave the page.");
  await button(dialog, "Keep playing").click();
  await expect(dialog).toBeHidden();
  await expect(page).toHaveURL(/\/play\/roulette$/);

  await button(topBar(page), "Cash out").click();
  await button(dialog, "Cash out").click();
  await expect(page).toHaveURL(/\/receipt$/);

  await expect(page.getByText("Cash-out receipt")).toBeVisible();
  await expect(receiptRow(page, "Bought in")).toHaveText("400,000");
  await expect(receiptRow(page, "Cashing out")).toHaveText(fmt(total));
  await expect(receiptRow(page, "Net result")).toHaveText(signed(total - 400_000));
  await expect(receiptRow(page, "Rounds played")).toHaveText(String(entries - 1));
  await expect(receiptRow(page, "Blackjack, 3 rounds")).toBeVisible();
  await expect(receiptRow(page, "Roulette, 2 rounds")).toBeVisible();
  await expect(page.locator("article li")).toHaveCount(entries);
  await expect(page.locator("article li").first()).toContainText("Bought in+400,000");
  await expect(page.getByText("Final total").locator("xpath=following-sibling::strong")).toHaveText(fmt(total));
  await expect(page.getByText(/^Ledger check/)).toHaveText(
    `Ledger check passed: ${entries} entries replayed, every balance and seal matches.`,
  );

  const download = page.waitForEvent("download");
  await button(page, "Download as text").click();
  const file = await download;
  expect(file.suggestedFilename()).toMatch(/^house-money-receipt-\d{4}-\d{2}-\d{2}\.txt$/);
  const text = await readFile(await file.path(), "utf8");
  expect(text.split("\n")[0]).toBe("HOUSE MONEY - CASH-OUT RECEIPT");
  expect(text).toContain(`FINAL TOTAL  ${fmt(total).padStart(16)}`);
  expect(text).toContain(`Ledger check passed: ${entries} entries replayed`);

  await button(page, "Start a new session").click();
  await expect(page).toHaveURL(/\/$/);
  await expect(amountInput(page)).toHaveValue("");
});

test("the page warns before leaving only while a session is open", async ({ page }) => {
  await buyIn(page);
  await blackjackRound(page, false);
  const warning = page.waitForEvent("dialog");
  await page.close({ runBeforeUnload: true });
  const dialog = await warning;
  expect(dialog.type()).toBe("beforeunload");
  await dialog.dismiss();
  expect(page.isClosed()).toBe(false);

  await button(topBar(page), "Cash out").click();
  await button(page.getByRole("dialog"), "Cash out").click();
  await expect(page).toHaveURL(/\/receipt$/);
  await page.close({ runBeforeUnload: true });
  await expect.poll(() => page.isClosed()).toBe(true);
});
