import { expect, test, type Page } from "@playwright/test";
import { blackjackRound, button, buyIn, openGame, sessionLog, topBar } from "./helpers";

const box = async (target: { boundingBox(): Promise<{ x: number; y: number; width: number; height: number } | null> }) => {
  const rect = await target.boundingBox();
  if (!rect) throw new Error("Not rendered");
  return rect;
};

const fitsWidth = (page: Page) =>
  page.evaluate(() => {
    const fits = (element: Element | null) => !element || element.scrollWidth <= element.clientWidth;
    return fits(document.documentElement) && fits(document.querySelector('[role="tablist"]'));
  });

async function everyScreenFits(page: Page): Promise<void> {
  for (const path of ["/", "/nowhere"]) {
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    expect(await fitsWidth(page)).toBe(true);
  }
  await buyIn(page, "1,000,000,000");
  expect(await fitsWidth(page)).toBe(true);
  for (const game of ["Baccarat", "Roulette", "Craps", "Blackjack"] as const) {
    await openGame(page, game);
    expect(await fitsWidth(page)).toBe(true);
  }
  await button(page, "How to play Blackjack").click();
  await expect(page.getByRole("dialog")).toBeVisible();
  expect(await fitsWidth(page)).toBe(true);
  await button(page.getByRole("dialog"), "Got it").click();
  await expect(page.getByRole("dialog")).toBeHidden();
  await button(topBar(page), "Cash out").click();
  await expect(page.getByRole("dialog")).toBeVisible();
  expect(await fitsWidth(page)).toBe(true);
  await button(page.getByRole("dialog"), "Cash out").click();
  await expect(page.getByText(/^Ledger check/)).toBeVisible();
  expect(await fitsWidth(page)).toBe(true);
}

test("no screen or tab bar scrolls sideways", async ({ page }, testInfo) => {
  await everyScreenFits(page);
  if (testInfo.project.name === "phone") {
    await page.setViewportSize({ width: 360, height: 780 });
    await everyScreenFits(page);
  }
});

test("ten-digit balances wrap in the header instead of widening the page", async ({ page }) => {
  await buyIn(page);
  // Measured in the same task, before the DOM guard puts the real numbers back.
  const overflow = await topBar(page)
    .locator("dl")
    .evaluate((stats) => {
      const values = ["1,500,000,000", "500,000,000", "+1,000,000,000"];
      stats.querySelectorAll("dd").forEach((dd, i) => {
        dd.textContent = values[i] ?? "";
      });
      return document.documentElement.scrollWidth - document.documentElement.clientWidth;
    });
  expect(overflow).toBe(0);
});

test("taps don't zoom and leave no hover tint", async ({ page }, testInfo) => {
  await buyIn(page);
  await openGame(page, "Roulette");
  const red = page.getByRole("button", { name: "Bet on red, pays 1 to 1" });
  await expect(red).toHaveCSS("touch-action", "manipulation");
  const resting = await red.evaluate((cell) => getComputedStyle(cell).backgroundColor);
  if (testInfo.project.name === "phone") {
    await red.tap();
    await expect(red.getByLabel(/on this bet$/)).toBeVisible();
    await expect(red).toHaveCSS("background-color", resting);
  } else {
    await red.hover();
    await expect(red).not.toHaveCSS("background-color", resting);
  }
});

test("the layout switches at the 900px and 620px breakpoints", async ({ page }, testInfo) => {
  const phone = testInfo.project.name === "phone";
  await buyIn(page);

  const play = await box(page.locator("section").first());
  const log = await box(sessionLog(page));
  if (phone) expect(log.y).toBeGreaterThanOrEqual(play.y + play.height - 1);
  else expect(log.x).toBeGreaterThanOrEqual(play.x + play.width - 1);

  await blackjackRound(page, false);
  expect((await box(page.getByRole("img").first())).width).toBe(phone ? 58 : 66);

  await openGame(page, "Baccarat");
  const player = await box(page.getByRole("button", { name: /^Bet on Player,/ }));
  const tie = await box(page.getByRole("button", { name: /^Bet on Tie,/ }));
  if (phone) expect(tie.y).toBeGreaterThan(player.y + player.height);
  else expect(Math.abs(tie.y - player.y)).toBeLessThan(1);

  await openGame(page, "Roulette");
  const zero = page.getByRole("button", { name: "Bet on zero" });
  const area = await zero.evaluate((cell) => {
    const style = getComputedStyle(cell);
    return [style.gridRowStart, style.gridColumnStart, style.gridRowEnd, style.gridColumnEnd].join(" / ");
  });
  expect(area).toBe(phone ? "1 / 3 / 2 / 6" : "1 / 1 / 4 / 2");

  const rack = page.getByRole("group", { name: "Chip value" }).locator("..");
  expect(await rack.evaluate((element) => getComputedStyle(element).position)).toBe(phone ? "sticky" : "static");
  if (phone) {
    await page.evaluate(() => window.scrollTo(0, 0));
    const rackBox = await box(rack);
    expect(Math.round(rackBox.y + rackBox.height)).toBe(page.viewportSize()?.height);
  }
});
