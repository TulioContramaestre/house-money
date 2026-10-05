import { expect, test } from "@playwright/test";
import { button, buyIn, chip, handInPlay, logCount, message, openGame, readStats, topBar } from "./helpers";

test("mid-hand, the other tabs and the cash-out are locked with a reason", async ({ page }) => {
  await buyIn(page);
  await handInPlay(page);
  await expect(page.getByRole("tab", { name: "Craps" })).toHaveClass(/locked/);
  await expect(page.getByRole("tab", { name: "Blackjack" })).not.toHaveClass(/locked/);
  await page.getByRole("tab", { name: "Craps" }).click();
  await expect(message(page)).toHaveText("Finish this hand first.");
  await expect(page).toHaveURL(/\/play\/blackjack$/);
  await button(topBar(page), "Cash out").click();
  await expect(page.getByRole("dialog")).toBeHidden();
  await expect(message(page)).toHaveText("Finish this hand first.");
});

test("the back button can't leave a locked game", async ({ page }) => {
  await buyIn(page);
  await openGame(page, "Baccarat");
  await openGame(page, "Blackjack");
  await handInPlay(page);
  await page.goBack();
  await expect(page).toHaveURL(/\/play\/blackjack$/);
  await expect(message(page)).toHaveText("Finish this hand first.");
  await expect(page.getByRole("tab", { name: "Blackjack" })).toHaveAttribute("aria-selected", "true");
  await expect(button(page, "Stand")).toBeVisible();
});

test("the back button moves between games that can be left", async ({ page }) => {
  await buyIn(page);
  await openGame(page, "Roulette");
  await openGame(page, "Craps");
  await page.goBack();
  await expect(page).toHaveURL(/\/play\/roulette$/);
  await expect(page.getByRole("tab", { name: "Roulette" })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("button", { name: "Bet on zero" })).toBeVisible();
});

test("leaving a game hands its unplayed chips back and clears them from the table", async ({ page }) => {
  await buyIn(page);
  await openGame(page, "Roulette");
  await page.getByRole("button", { name: "Bet on red, pays 1 to 1" }).click();
  await page.getByRole("button", { name: "Bet on 17 black, pays 35 to 1" }).click();
  await expect.poll(() => readStats(page)).toEqual({ cash: 390_000, onTable: 10_000, net: 0 });
  await openGame(page, "Craps");
  await expect.poll(() => readStats(page)).toEqual({ cash: 400_000, onTable: 0, net: 0 });
  expect(await logCount(page)).toBe(1);

  await openGame(page, "Roulette");
  await expect(page.getByLabel(/on this bet$/)).toHaveCount(0);
  for (const name of ["Undo", "Clear", "Spin"]) await expect(button(page, name)).toHaveAttribute("aria-disabled", "true");
  await expect(message(page)).toHaveText("Place chips on the layout, then spin.");
});

test("running out of chips shows the broke banner with a way out", async ({ page }) => {
  await buyIn(page, "1k");
  await openGame(page, "Roulette");
  await expect(chip(page, "1,000")).toHaveAttribute("aria-pressed", "true");
  const banner = page.getByText("You're out of chips. Cash out to see how the session went.");
  for (let spin = 0; spin < 100 && !(await banner.isVisible()); spin++) {
    const before = await logCount(page);
    await page.getByRole("button", { name: "Bet on zero" }).click();
    await button(page, "Spin").click();
    await expect.poll(() => logCount(page)).toBe(before + 1);
  }
  await expect(banner).toBeVisible();
  await expect.poll(() => readStats(page)).toEqual({ cash: 0, onTable: 0, net: -1000 });
  await expect(page.getByRole("group", { name: "Chip value" }).getByRole("button", { disabled: false })).toHaveCount(0);
  await banner.locator("..").getByRole("button", { name: "Cash out" }).click();
  await expect(page.getByRole("dialog", { name: "Cash out 0?" })).toBeVisible();
});
