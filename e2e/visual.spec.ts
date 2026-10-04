import path from "node:path";
import { pathToFileURL } from "node:url";
import { expect, test, type Page } from "@playwright/test";
import { amountHint, amountInput, button, enterAmount, isDisabled, selectChip } from "./helpers";

type Side = "reference" | "app";

const REFERENCE = pathToFileURL(path.resolve(__dirname, "..", "reference", "index.html")).href;
const FROZEN = new Date("2026-10-02T14:30:00");

/** Both pages capture crypto.getRandomValues at load, so the same seed deals the same shoes. */
function seedRandomness() {
  let state = 0x2545f491;
  const next = () => {
    state ^= state << 13;
    state >>>= 0;
    state ^= state >>> 17;
    state ^= state << 5;
    state >>>= 0;
    return state;
  };
  crypto.getRandomValues = <T extends ArrayBufferView | null>(array: T): T => {
    if (array instanceof Uint8Array || array instanceof Uint16Array || array instanceof Uint32Array) {
      for (let i = 0; i < array.length; i++) array[i] = next();
    }
    return array;
  };
}

async function waitForTurn(page: Page, again: RegExp) {
  await expect(async () => {
    if (await button(page, again).isVisible()) return;
    const stand = button(page, "Stand");
    if ((await stand.isVisible()) && !(await isDisabled(stand))) return;
    throw new Error("Still dealing");
  }).toPass();
}

async function openTab(page: Page, name: string) {
  await page.getByRole("tab", { name }).click();
  await expect(page.getByRole("tab", { name })).toHaveAttribute("aria-selected", "true");
}

async function tour(page: Page, shot: (name: string) => Promise<void>) {
  await expect(amountInput(page)).toBeVisible();
  await shot("01-buyin");
  await enterAmount(page, "400k");
  await shot("02-buyin-typed");
  await amountInput(page).fill("1234");
  await button(page, "Buy in").click();
  await expect(amountHint(page)).toHaveText(/^Use whole thousands/);
  await shot("03-buyin-error");
  await enterAmount(page, "400k");
  await button(page, "Buy in").click();

  const circle = page.getByRole("button", { name: /chip to your bet$/ });
  await expect(circle).toBeVisible();
  await shot("04-blackjack");
  await selectChip(page, "25,000");
  await circle.click();
  await shot("05-blackjack-bet");
  await button(page, "Deal").click();
  await waitForTurn(page, /^Deal [\d,]+ again$/);
  await shot("06-blackjack-dealt");
  if (await button(page, "Stand").isVisible()) await button(page, "Stand").click();
  await expect(button(page, /^Deal [\d,]+ again$/)).toBeVisible();
  await shot("07-blackjack-settled");

  await openTab(page, "Baccarat");
  await shot("08-baccarat");
  await page.getByRole("button", { name: /^Bet on Player,/ }).click();
  await page.getByRole("button", { name: /^Bet on Tie,/ }).click();
  await shot("09-baccarat-bets");
  await button(page, "Deal").click();
  await expect(button(page, /^Deal [\d,]+ again$/)).toBeVisible();
  await shot("10-baccarat-dealt");

  await openTab(page, "Roulette");
  await shot("11-roulette");
  for (const cell of ["17 black, pays 35 to 1", "red, pays 1 to 1", "2nd 12, pays 2 to 1", "column 3, pays 2 to 1"]) {
    await page.getByRole("button", { name: `Bet on ${cell}` }).click();
  }
  await shot("12-roulette-bets");
  await button(page, "Spin").click();
  await expect(button(page, /^Spin [\d,]+ again$/)).toBeVisible();
  await shot("13-roulette-spun");

  await openTab(page, "Craps");
  await shot("14-craps");
  await page.getByRole("button", { name: /^Pass line, pays/ }).click();
  await page.getByRole("button", { name: /^Field, pays/ }).click();
  await shot("15-craps-bets");
  const rolls = page.getByLabel("Recent rolls").getByRole("listitem");
  await button(page, "Roll").click();
  await expect(rolls).toHaveCount(1);
  await shot("16-craps-rolled");
  for (let roll = 2; roll < 60 && (await page.getByText("On", { exact: true }).isVisible()); roll++) {
    await button(page, "Roll").click();
    await expect(rolls).toHaveCount(roll > 18 ? 18 : roll);
  }

  await button(page.getByRole("banner"), "Cash out").click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await shot("17-cashout-dialog");
  await button(page.getByRole("dialog"), "Cash out").click();
  await expect(page.getByText(/^Ledger check/)).toBeVisible();
  await shot("18-receipt");
  await page.emulateMedia({ media: "print" });
  await shot("19-receipt-print");
}

for (const side of ["reference", "app"] as const satisfies readonly Side[]) {
  test(`screens for side-by-side review: ${side} @visual`, async ({ page }, testInfo) => {
    test.setTimeout(120_000);
    await page.clock.setFixedTime(FROZEN);
    await page.addInitScript(seedRandomness);
    await page.goto(side === "reference" ? REFERENCE : "/");
    const folder = path.join("test-results", "visual", testInfo.project.name);
    await tour(page, async (name) => {
      await page.mouse.move(0, 0);
      await page.evaluate(async () => {
        await document.fonts.ready;
      });
      await page.screenshot({ path: path.join(folder, `${name}-${side}.png`), fullPage: true, animations: "disabled" });
    });
  });
}
