import { expect, test } from "@playwright/test";
import { button, buyIn, chip, handInPlay, logCount, message, openGame } from "./helpers";

test.describe("with motion", () => {
  test.use({ reducedMotion: "no-preference" });

  test("the wheel spins to the pocket, settles, then rests on the first lap", async ({ page }) => {
    await buyIn(page);
    await openGame(page, "Roulette");
    const strip = page.locator('[class*="__strip"]');
    const position = () => strip.evaluate((element) => Number(element.style.getPropertyValue("--i")));
    expect(await position()).toBeGreaterThanOrEqual(37);
    expect(await position()).toBeLessThan(74);

    await page.getByRole("button", { name: "Bet on red, pays 1 to 1" }).click();
    await button(page, "Spin").click();
    await expect(strip).toHaveClass(/spinning/);
    await expect(message(page)).toHaveText("No more bets.");
    expect(await position()).toBeGreaterThanOrEqual(148);
    await expect(button(page, "Spin")).toHaveAttribute("aria-disabled", "true");

    await expect(strip).not.toHaveClass(/spinning/, { timeout: 6000 });
    await expect(message(page)).toHaveText(/^\d+ (red|black|green)\. You (win|lose) 5,000\.$/);
    expect(await position()).toBeGreaterThanOrEqual(37);
    expect(await position()).toBeLessThan(74);
    expect(await logCount(page)).toBe(2);
  });

  test("dealt cards slide in and the dice tumble before landing", async ({ page }) => {
    await buyIn(page);
    await handInPlay(page);
    const holeCard = page.getByRole("img", { name: "Face-down card" });
    expect(await holeCard.evaluate((element) => getComputedStyle(element).animationName)).toMatch(/deal/);

    const before = await logCount(page);
    await button(page, "Stand").click();
    await expect.poll(() => logCount(page)).toBe(before + 1);
    await openGame(page, "Craps");
    await page.getByRole("button", { name: /^Field, pays/ }).click();
    await button(page, "Roll").click();
    await expect(message(page)).toHaveText("Rolling…");
    await expect(message(page)).toHaveText(/^Rolled \d+\./);
    await expect(page.getByLabel("Recent rolls").getByRole("listitem")).toHaveCount(1);
  });
});

test("with reduced motion nothing animates", async ({ page }) => {
  await buyIn(page);
  await handInPlay(page);
  const holeCard = page.getByRole("img", { name: "Face-down card" });
  expect(await holeCard.evaluate((element) => getComputedStyle(element).animationName)).toBe("none");
  await expect(chip(page, "5,000")).toHaveCSS("transition-duration", "0s");
});
