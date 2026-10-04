import { expect, test } from "@playwright/test";
import { blackjackRound, buyIn, openGame, sessionLog } from "./helpers";

const box = async (target: { boundingBox(): Promise<{ x: number; y: number; width: number; height: number } | null> }) => {
  const rect = await target.boundingBox();
  if (!rect) throw new Error("Not rendered");
  return rect;
};

test("no screen scrolls sideways", async ({ page }) => {
  const fitsWidth = () => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);
  for (const path of ["/", "/nowhere"]) {
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    expect(await fitsWidth()).toBe(true);
  }
  await buyIn(page);
  for (const game of ["Baccarat", "Roulette", "Craps"] as const) {
    await openGame(page, game);
    expect(await fitsWidth()).toBe(true);
  }
});

test("the layout follows the reference breakpoints", async ({ page }, testInfo) => {
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
