import { expect, test } from "@playwright/test";
import {
  DEFAULT_HINT,
  amountHint,
  amountInput,
  button,
  buyIn,
  chip,
  enterAmount,
  message,
  readStats,
  sessionLog,
  topEntry,
} from "./helpers";

test("the buy-in form checks the amount before opening a session", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("HouseMoney");
  await enterAmount(page, "1.5m");
  await expect(amountHint(page)).toHaveText("1,500,000 in chips.");
  await amountInput(page).blur();
  await expect(amountInput(page)).toHaveValue("1,500,000");

  const refusals: readonly (readonly [string, string])[] = [
    ["", "Enter an amount in whole thousands, like 400,000."],
    ["abc", "Enter an amount in whole thousands, like 400,000."],
    ["500", "The smallest buy-in is 1,000."],
    ["2000m", "The largest buy-in is 1,000,000,000."],
    ["1234", "Use whole thousands: 1,000 or 2,000 would work."],
  ];
  for (const [amount, error] of refusals) {
    await amountInput(page).fill(amount);
    await expect(amountHint(page)).toHaveText(DEFAULT_HINT);
    await button(page, "Buy in").click();
    await expect(amountHint(page)).toHaveText(error);
    await expect(amountInput(page)).toBeFocused();
    await expect(page).toHaveURL(/\/$/);
  }

  await button(page, "250,000").click();
  await expect(amountInput(page)).toHaveValue("250,000");
  await expect(amountHint(page)).toHaveText("250,000 in chips.");
  await expect(amountInput(page)).toBeFocused();
});

test("buying in opens the casino on blackjack", async ({ page }) => {
  await buyIn(page, "$400_000");
  expect(await readStats(page)).toEqual({ cash: 400_000, onTable: 0, net: 0 });
  await expect(message(page)).toHaveText("Pick a chip, then tap the bet circle.");
  await expect(sessionLog(page).locator("h2 + span")).toHaveText("1 entry, newest first");
  await expect(topEntry(page)).toContainText("Cashier");
  await expect(topEntry(page)).toContainText("Bought in+400,000");
  await expect(topEntry(page)).toContainText("Balance 400,000");
  await expect(chip(page, "5,000")).toHaveAttribute("aria-pressed", "true");
  await expect(chip(page, "500,000")).toBeDisabled();
});

test("game and receipt pages send you to the cashier without a session", async ({ page }) => {
  for (const path of ["/play", "/play/roulette", "/receipt"]) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/$/);
    await expect(amountInput(page)).toBeVisible();
  }
});

test("unknown pages point back to the cashier", async ({ page }) => {
  for (const path of ["/play/poker", "/nowhere"]) {
    const response = await page.goto(path);
    expect(response?.status()).toBe(404);
    await expect(page.getByText("There's no table here.")).toBeVisible();
  }
  await page.getByRole("link", { name: "Go to the cashier" }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(amountInput(page)).toBeVisible();
});
