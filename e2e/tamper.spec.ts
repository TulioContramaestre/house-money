import { expect, test } from "@playwright/test";
import { button, buyIn, chip, logCount, message, readStats, sessionLog, stat, topEntry } from "./helpers";

test("edits to the header numbers snap back", async ({ page }) => {
  await buyIn(page);
  await stat(page, "Cash").evaluate((dd) => {
    dd.textContent = "9,999,999";
  });
  await expect(stat(page, "Cash")).toHaveText("400,000");
  await stat(page, "Session").evaluate((dd) => {
    const text = dd.firstChild;
    if (text) text.nodeValue = "+1,000,000";
  });
  await expect(stat(page, "Session")).toHaveText("0");
});

test("edits to the session log snap back", async ({ page }) => {
  await buyIn(page);
  const list = sessionLog(page).getByRole("list");
  await list.evaluate((ol) => {
    ol.innerHTML = "<li>Bought in +1,000,000,000</li><li>Bet 1,000 +999,000</li>";
  });
  await expect(list.getByRole("listitem")).toHaveCount(1);
  await expect(topEntry(page)).toContainText("Bought in+400,000");

  await topEntry(page).evaluate((li) => li.setAttribute("style", "display:none"));
  await expect(topEntry(page)).toBeVisible();
  await expect(topEntry(page)).not.toHaveAttribute("style");

  await topEntry(page).getByText(/^Balance /).evaluate((div) => {
    div.textContent = "Balance 9,000,000";
  });
  await expect(topEntry(page).getByText(/^Balance /)).toHaveText("Balance 400,000");
});

test("re-enabled buttons can't bet past the bankroll or out of turn", async ({ page }) => {
  await buyIn(page, "5k");
  const big = chip(page, "25,000");
  await expect(big).toBeDisabled();
  await big.evaluate((chip) => chip.removeAttribute("disabled"));
  await big.click();
  await expect(chip(page, "5,000")).toHaveAttribute("aria-pressed", "true");

  const deal = button(page, "Deal");
  await expect(deal).toHaveAttribute("aria-disabled", "true");
  await deal.evaluate((element) => element.removeAttribute("aria-disabled"));
  await deal.click();
  await expect(message(page)).toHaveText("Pick a chip, then tap the bet circle.");
  expect(await readStats(page)).toEqual({ cash: 5000, onTable: 0, net: 0 });

  await page.getByRole("button", { name: /chip to your bet$/ }).click();
  await page.getByRole("button", { name: /chip to your bet$/ }).click();
  await expect(message(page)).toHaveText("You don't have 5,000 in cash.");
  expect(await readStats(page)).toEqual({ cash: 0, onTable: 5000, net: 0 });
  expect(await logCount(page)).toBe(1);
});

test("nothing about the session is reachable from the page", async ({ page }) => {
  await buyIn(page);
  const exposed = await page.evaluate(() =>
    ["ledger", "session", "engines", "games", "chip"].filter((name) => name in window),
  );
  expect(exposed).toEqual([]);
});
