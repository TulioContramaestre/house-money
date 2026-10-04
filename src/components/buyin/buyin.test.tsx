// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { createSession, type Session } from "@/session/session";
import { BuyInScreen } from "./BuyInScreen";
import { NoTable } from "./NoTable";

const mocks = vi.hoisted(() => {
  const holder: { session?: Session } = {};
  const router = { replace: vi.fn(), push: vi.fn() };
  return { holder, router };
});

vi.mock("next/navigation", () => ({ useRouter: () => mocks.router }));

vi.mock("@/session/session", async (importOriginal) => {
  const real = await importOriginal<typeof import("@/session/session")>();
  return {
    ...real,
    get session() {
      if (!mocks.holder.session) throw new Error("No session for this test");
      return mocks.holder.session;
    },
  };
});

const input = () => screen.getByLabelText("How much are you bringing to the table?");
const hint = () => document.getElementById(input().getAttribute("aria-describedby") ?? "");
const type = (value: string) => fireEvent.change(input(), { target: { value } });

afterEach(cleanup);

describe("BuyInScreen", () => {
  beforeEach(() => {
    mocks.holder.session = createSession();
    mocks.router.replace.mockClear();
    render(<BuyInScreen />);
  });

  test("starts with the brand, the lede and the default hint", () => {
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("HouseMoney");
    expect(screen.getByText("A practice casino with play money. Blackjack, baccarat, roulette and craps.")).toBeTruthy();
    expect(input().getAttribute("placeholder")).toBe("400,000");
    expect(hint()?.textContent).toBe("Whole thousands. You can also type 400k or 1.5m.");
    expect(screen.getByText("Nothing is saved. Closing or refreshing the page ends the session.")).toBeTruthy();
  });

  test("the hint reads back valid amounts while typing, and blur tidies them", () => {
    type("400k");
    expect(hint()?.textContent).toBe("400,000 in chips.");
    type("1.5m");
    expect(hint()?.textContent).toBe("1,500,000 in chips.");
    fireEvent.blur(input());
    expect(input()).toHaveProperty("value", "1,500,000");
    type("12");
    expect(hint()?.textContent).toBe("Whole thousands. You can also type 400k or 1.5m.");
    fireEvent.blur(input());
    expect(input()).toHaveProperty("value", "12");
  });

  test("quick amounts fill in the field and focus it", () => {
    fireEvent.click(screen.getByRole("button", { name: "250,000" }));
    expect(input()).toHaveProperty("value", "250,000");
    expect(hint()?.textContent).toBe("250,000 in chips.");
    expect(document.activeElement).toBe(input());
    expect(screen.getAllByRole("button").map((b) => b.textContent)).toEqual(["100,000", "250,000", "400,000", "1,000,000", "Buy in"]);
  });

  test.each([
    ["", "Enter an amount in whole thousands, like 400,000."],
    ["500", "The smallest buy-in is 1,000."],
    ["2000m", "The largest buy-in is 1,000,000,000."],
    ["1234", "Use whole thousands: 1,000 or 2,000 would work."],
  ])("%j is refused with %j", (value, message) => {
    type(value);
    fireEvent.click(screen.getByRole("button", { name: "Buy in" }));
    expect(hint()?.textContent).toBe(message);
    expect(hint()?.className).toBe("hint err");
    expect(document.activeElement).toBe(input());
    type(`${value}0`);
    expect(hint()?.className).toBe("hint");
  });

  test("a valid amount opens the session and heads for the tables", async () => {
    type("400k");
    fireEvent.click(screen.getByRole("button", { name: "Buy in" }));
    await waitFor(() => expect(mocks.router.replace).toHaveBeenCalledWith("/play"));
    expect(mocks.holder.session?.getLedgerSnapshot().cash).toBe(400_000);
    expect(screen.queryByRole("button", { name: "Buy in" })).toBeNull();
  });
});

test("NoTable points back to the cashier", () => {
  render(<NoTable />);
  expect(screen.getByText("There's no table here.")).toBeTruthy();
  expect(screen.getByRole("link", { name: "Go to the cashier" }).getAttribute("href")).toBe("/");
});
