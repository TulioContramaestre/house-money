import { expect, test, type Locator } from "@playwright/test";
import { button, buyIn, logCount, openGame, playRound, sessionLog, topEntry } from "./helpers";

const offsetOf = (list: Locator, seq: number) =>
  list.evaluate((ol, wanted) => {
    const item = [...ol.children].find((li) => li.textContent?.includes(`#${wanted} `));
    if (!item) throw new Error(`No entry #${wanted}`);
    return item.getBoundingClientRect().top - ol.getBoundingClientRect().top;
  }, seq);

test("new entries go on top without moving what you're reading", async ({ page }) => {
  await buyIn(page);
  await openGame(page, "Roulette");
  const spin = () =>
    playRound(page, async () => {
      const again = button(page, /^Spin [\d,]+ again$/);
      if (await again.isVisible()) await again.click();
      else {
        await page.getByRole("button", { name: "Bet on red, pays 1 to 1" }).click();
        await button(page, "Spin").click();
      }
    });
  for (let round = 0; round < 14; round++) await spin();
  await expect(sessionLog(page).locator("h2 + span")).toHaveText("15 entries, newest first");
  await expect(topEntry(page)).toContainText("#15 ");
  await expect(topEntry(page)).toHaveClass(/fresh/);

  const list = sessionLog(page).getByRole("list");
  await spin();
  expect(await list.evaluate((ol) => ol.scrollTop)).toBeLessThan(8);
  await expect(topEntry(page)).toContainText("#16 ");

  await list.evaluate((ol) => {
    ol.scrollTop = 240;
  });
  const reading = (await logCount(page)) - 3;
  const before = await offsetOf(list, reading);
  await spin();
  await expect(topEntry(page)).toContainText("#17 ");
  expect(Math.abs((await offsetOf(list, reading)) - before)).toBeLessThanOrEqual(1);
  expect(await list.evaluate((ol) => ol.scrollTop)).toBeGreaterThan(240);
});
