import { expect, test } from "@playwright/test";
import { button, buyIn, expectLedgerAddsUp, logCount, message, openGame, playRound, topLogDetail } from "./helpers";

const DETAIL = /^Rolled (\d+) \(\d and \d\)\. .+\.$/;
const spot = (name: string) => new RegExp(`^${name}, pays`);

test("ten rolls of craps keep the log, the point and the header in step", async ({ page }) => {
  await buyIn(page);
  await openGame(page, "Craps");
  const puckOn = page.getByText("On", { exact: true });
  let triedToLeave = false;
  for (let round = 0; round < 10; round++) {
    await playRound(page, async () => {
      if (!(await puckOn.isVisible())) {
        const pass = page.getByRole("button", { name: spot("Pass line") });
        if (!(await pass.getByLabel(/on this bet$/).isVisible())) await pass.click();
      }
      await page.getByRole("button", { name: spot("Field") }).click();
      await button(page, "Roll").click();
    });
    expect(await topLogDetail(page)).toMatch(DETAIL);
    await expectLedgerAddsUp(page);

    const passUp = page.getByRole("button", { name: spot("Pass line") }).getByLabel(/on this bet$/);
    if (!triedToLeave && (await puckOn.isVisible()) && (await passUp.isVisible())) {
      triedToLeave = true;
      await page.getByRole("tab", { name: "Blackjack" }).click();
      await expect(message(page)).toHaveText(/^Your line bet stays up until the \d+ is rolled or a 7 comes\. Keep rolling\.$/);
      await expect(page).toHaveURL(/\/play\/craps$/);
    }
  }
  await expect(page.getByLabel("Recent rolls").getByRole("listitem")).toHaveCount(10);
  expect(await logCount(page)).toBe(11);
});

test("odds stay closed on the come-out roll", async ({ page }, testInfo) => {
  await buyIn(page);
  await openGame(page, "Craps");
  await page.getByRole("button", { name: /^Odds, pays True odds behind the pass line$/ }).click();
  await expect(message(page)).toHaveText("Odds open once a point is set.");
  const offPuck = page.getByText("Off", { exact: true });
  if (testInfo.project.name === "phone") await expect(offPuck).toBeHidden();
  else await expect(offPuck).toBeVisible();
});
