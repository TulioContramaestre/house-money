import { expect, type Locator, type Page } from "@playwright/test";

export const DEFAULT_HINT = "Whole thousands. You can also type 400k or 1.5m.";

export function money(text: string | null): number {
  const match = /([+−-]?)([\d,]+)/.exec(text ?? "");
  if (!match) throw new Error(`No amount in ${JSON.stringify(text)}`);
  const [, sign = "", digits = ""] = match;
  const value = Number(digits.replaceAll(",", ""));
  return sign === "−" || sign === "-" ? -value : value;
}

export const amountInput = (page: Page) => page.getByLabel("How much are you bringing to the table?");
export const amountHint = (page: Page) => page.locator("form p[aria-live]");
export const button = (scope: Page | Locator, name: string | RegExp) =>
  scope.getByRole("button", { name, exact: typeof name === "string" });
export const message = (page: Page) => page.locator("section p[aria-live]");
export const sessionLog = (page: Page) => page.getByRole("complementary", { name: "Session log" });
export const topBar = (page: Page) => page.getByRole("banner");

export async function isDisabled(target: Locator): Promise<boolean> {
  return (await target.getAttribute("aria-disabled")) === "true";
}

/** Types until React answers with the hint, so nothing is typed before hydration. */
export async function enterAmount(page: Page, amount: string): Promise<void> {
  await expect(async () => {
    await amountInput(page).fill("");
    await amountInput(page).fill(amount);
    await expect(amountHint(page)).toHaveText(/ in chips\.$/, { timeout: 500 });
  }).toPass();
}

export async function buyIn(page: Page, amount = "400k"): Promise<void> {
  await page.goto("/");
  await enterAmount(page, amount);
  await button(page, "Buy in").click();
  await expect(page).toHaveURL(/\/play\/blackjack$/);
  await expect(page.getByRole("tablist", { name: "Games" })).toBeVisible();
}

export async function openGame(page: Page, name: "Blackjack" | "Baccarat" | "Roulette" | "Craps"): Promise<void> {
  await page.getByRole("tab", { name }).click();
  await expect(page).toHaveURL(new RegExp(`/play/${name.toLowerCase()}$`));
  await expect(page.getByRole("tab", { name })).toHaveAttribute("aria-selected", "true");
}

export const chip = (page: Page, value: string) => page.getByRole("button", { name: `${value} chip`, exact: true });

export const stat = (page: Page, name: string) =>
  topBar(page).locator("dt", { hasText: new RegExp(`^${name}$`) }).locator("xpath=following-sibling::dd[1]");

export async function readStats(page: Page) {
  const cash = money(await stat(page, "Cash").textContent());
  const onTable = money(await stat(page, "On the table").textContent());
  const net = money(await stat(page, "Session").textContent());
  return { cash, onTable, net };
}

export async function logCount(page: Page): Promise<number> {
  return money(await sessionLog(page).locator("h2 + span").textContent());
}

export const topEntry = (page: Page) => sessionLog(page).getByRole("listitem").first();

export async function topLogBalance(page: Page): Promise<number> {
  return money(await topEntry(page).getByText(/^Balance /).textContent());
}

export async function topLogDetail(page: Page): Promise<string> {
  return (await topEntry(page).locator("p").textContent()) ?? "";
}

/** The newest log line's balance is the ledger balance, which is always cash plus what's on the table. */
export async function expectLedgerAddsUp(page: Page): Promise<void> {
  await expect
    .poll(async () => {
      const { cash, onTable } = await readStats(page);
      return cash + onTable - (await topLogBalance(page));
    })
    .toBe(0);
}

/** Runs one round and waits for exactly one new log entry. */
export async function playRound(page: Page, play: () => Promise<void>): Promise<void> {
  const before = await logCount(page);
  await play();
  await expect.poll(() => logCount(page), { timeout: 15_000 }).toBe(before + 1);
}

/** Deals one hand (repeating the last bet when asked) and stands until it settles. */
export async function blackjackRound(page: Page, rebet: boolean): Promise<void> {
  const before = await logCount(page);
  const again = button(page, /^Deal [\d,]+ again$/);
  if (rebet && (await again.isVisible())) {
    await again.click();
  } else {
    await page.getByRole("button", { name: /chip to your bet$/ }).click();
    await button(page, "Deal").click();
  }
  await expect(async () => {
    if ((await logCount(page)) > before) return;
    const stand = button(page, "Stand");
    if ((await stand.isVisible()) && !(await isDisabled(stand))) await stand.click();
    throw new Error("The hand is still in play");
  }).toPass({ timeout: 15_000 });
  expect(await logCount(page)).toBe(before + 1);
}

/** Deals until a hand is waiting on the player, so the game can't be left. */
export async function handInPlay(page: Page): Promise<void> {
  const stand = button(page, "Stand");
  const again = button(page, /^Deal [\d,]+ again$/);
  await expect(async () => {
    if ((await stand.isVisible()) && !(await isDisabled(stand))) return;
    if (await again.isVisible()) await again.click();
    else if (await button(page, "Deal").isVisible()) {
      await page.getByRole("button", { name: /chip to your bet$/ }).click();
      await button(page, "Deal").click();
    }
    throw new Error("No hand in play yet");
  }).toPass({ timeout: 15_000 });
}
