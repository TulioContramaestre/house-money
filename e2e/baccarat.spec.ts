import { expect, test } from "@playwright/test";
import { button, buyIn, expectLedgerAddsUp, logCount, openGame, playRound, topLogDetail } from "./helpers";

const DETAIL = /^(Tie at \d|(Player|Banker) wins \d to \d)(, a natural)?\. Bets on (player|tie|banker) [\d,]+(, (player|tie|banker) [\d,]+)*\.$/;
const SPOTS = ["Player", "Banker", "Tie"] as const;

test("ten coups of baccarat keep the log, the road and the header in step", async ({ page }) => {
  await buyIn(page);
  await openGame(page, "Baccarat");
  const road = page.getByLabel("Recent results");
  for (let round = 0; round < 10; round++) {
    await playRound(page, async () => {
      if (round % 3 === 2) {
        await button(page, /^Deal [\d,]+ again$/).click();
        return;
      }
      await page.getByRole("button", { name: new RegExp(`^Bet on ${SPOTS[round % 3]},`) }).click();
      await button(page, "Deal").click();
    });
    await expect(road).toContainText(`Last ${round + 1}`);
    expect(await topLogDetail(page)).toMatch(DETAIL);
    await expectLedgerAddsUp(page);
  }
  await expect(road.locator("[title]")).toHaveCount(10);
  expect(await logCount(page)).toBe(11);
});
