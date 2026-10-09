import { expect, test } from "@playwright/test";
import { button, buyIn, handInPlay, message, openGame } from "./helpers";

const GAMES = [
  { name: "Blackjack", line: "Draws to 16 and stands on all 17s, soft 17 included." },
  { name: "Baccarat", line: "Banker pays 0.95 to 1, a 5% commission." },
  { name: "Roulette", line: "A straight-up bet on any single number, 0 included, pays 35 to 1." },
  { name: "Craps", line: "Pass wins on 7 or 11 and loses on 2, 3 or 12." },
] as const;

test("each table's rules button opens that game's rules", async ({ page }) => {
  await buyIn(page);
  for (const { name, line } of GAMES) {
    await openGame(page, name);
    await button(page, `How to play ${name}`).click();
    const dialog = page.getByRole("dialog", { name: `How to play ${name}` });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("heading", { level: 2 })).toBeInViewport();
    await expect(dialog).toContainText(line);
    await button(dialog, "Got it").click();
    await expect(dialog).toBeHidden();
  }
});

test("the rules sit just above the felt's top right", async ({ page }) => {
  await buyIn(page);
  const felt = message(page).locator("xpath=../following-sibling::div[1]");
  const [icon, msg, table] = await Promise.all([
    button(page, "How to play Blackjack").boundingBox(),
    message(page).boundingBox(),
    felt.boundingBox(),
  ]);
  if (!icon || !msg || !table) throw new Error("Not rendered");
  expect(icon.x).toBeGreaterThan(msg.x + msg.width - 1);
  expect(Math.round(table.x + table.width - (icon.x + icon.width))).toBe(8);
  expect(table.y - (icon.y + icon.height)).toBeGreaterThanOrEqual(9);
});

test("the rules close with Got it, the ×, Escape or a tap outside, but not a tap inside", async ({ page }, testInfo) => {
  await buyIn(page);
  const dialog = page.getByRole("dialog", { name: "How to play Blackjack" });
  const outside = () => (testInfo.project.name === "phone" ? page.touchscreen.tap(4, 4) : page.mouse.click(4, 4));
  const closers = [
    () => button(dialog, "Got it").click(),
    () => button(dialog, "Close").click(),
    () => page.keyboard.press("Escape"),
    outside,
  ];
  for (const close of closers) {
    await button(page, "How to play Blackjack").click();
    await expect(dialog).toBeVisible();
    await dialog.getByText("Draws to 16 and stands on all 17s, soft 17 included.").click();
    await expect(dialog).toBeVisible();
    await close();
    await expect(dialog).toBeHidden();
  }
});

test("reading the rules mid-hand leaves the hand in play", async ({ page }) => {
  await buyIn(page);
  await handInPlay(page);
  const before = await message(page).textContent();
  await button(page, "How to play Blackjack").click();
  await button(page.getByRole("dialog"), "Got it").click();
  await expect(message(page)).toHaveText(before ?? "");
  await expect(button(page, "Stand")).toBeVisible();
});
