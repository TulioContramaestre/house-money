// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { seededRng, type Rng } from "@/lib/random/rng";
import { createSession, type Session } from "@/session/session";
import { flush } from "@/test/engineHarness";
import { ReceiptScreen } from "./ReceiptScreen";

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

const seeded = seededRng(3);
const zeroWheel: Rng = { int: (n) => (n === 37 ? 0 : seeded.int(n)) };

async function closedSession(): Promise<Session> {
  const session = createSession({ rng: zeroWheel, pause: () => Promise.resolve(), reducedMotion: () => true });
  mocks.holder.session = session;
  await act(async () => {
    await session.open(100_000);
    session.requestSwitch("roulette");
    session.dispatch("roulette", { type: "bet", key: "red" });
    session.dispatch("roulette", { type: "spin" });
    await flush();
    await session.confirmCashOut();
  });
  return session;
}

const row = (label: string) => screen.getByText(label, { selector: "dt" }).nextElementSibling;

beforeEach(() => mocks.router.replace.mockClear());
afterEach(cleanup);

test("renders nothing and goes back to the cashier without a closed session", () => {
  mocks.holder.session = createSession();
  const { container } = render(<ReceiptScreen />);
  expect(container.innerHTML).toBe("");
  expect(mocks.router.replace).toHaveBeenCalledWith("/");
});

test("prints the summary, the stats and the per-game lines from the ledger", async () => {
  await closedSession();
  render(<ReceiptScreen />);
  expect(screen.getByText("Cash-out receipt")).toBeTruthy();
  expect(screen.getByText(/ to /, { selector: "header p" })).toBeTruthy();
  expect([row("Bought in"), row("Cashing out"), row("Net result")].map((dd) => dd?.textContent)).toEqual(["100,000", "95,000", "−5,000"]);
  expect(row("Net result")?.parentElement?.className).toBe("net neg");
  expect(row("Cashing out")?.parentElement?.hasAttribute("class")).toBe(false);
  expect(
    ["Rounds played", "Won, lost, pushed", "Total wagered", "Biggest win", "Biggest loss"].map((label) => row(label)?.textContent),
  ).toEqual(["1", "0, 1, 0", "5,000", "None", "−5,000 Roulette"]);
  expect(row("Roulette, 1 round")?.textContent).toBe("−5,000");
  expect(screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent)).toEqual(["Session", "By game", "Full log, oldest first"]);
});

test("lists the full log oldest first and closes with the total and the check", async () => {
  await closedSession();
  render(<ReceiptScreen />);
  const entries = screen.getAllByRole("listitem");
  expect(entries.map((e) => e.querySelector("b")?.textContent)).toEqual(["Cashier", "Roulette"]);
  expect(entries.some((e) => e.className.includes("fresh"))).toBe(false);
  expect(screen.getByText("Final total").nextElementSibling?.textContent).toBe("95,000");
  const check = screen.getByText(/^Ledger check passed: 2 entries replayed/);
  expect(check.textContent).toBe("Ledger check passed: 2 entries replayed, every balance and seal matches.");
  expect(check.className).toBe("check");
  expect(screen.getByText("Play money only. Nothing from this session was saved, and it's gone when you leave this page.")).toBeTruthy();
});

test("downloads the plain-text receipt and prints the page", async () => {
  const session = await closedSession();
  render(<ReceiptScreen />);
  const blobs: Blob[] = [];
  Object.defineProperty(URL, "createObjectURL", {
    configurable: true,
    value: (blob: Blob) => {
      blobs.push(blob);
      return "blob:receipt";
    },
  });
  Object.defineProperty(URL, "revokeObjectURL", { configurable: true, value: vi.fn() });
  const saved: string[] = [];
  vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (this: HTMLAnchorElement) {
    saved.push(this.download);
  });
  fireEvent.click(screen.getByRole("button", { name: "Download as text" }));
  expect(saved).toHaveLength(1);
  expect(saved[0]).toMatch(/^house-money-receipt-\d{4}-\d{2}-\d{2}\.txt$/);
  expect(await blobs[0]?.text()).toBe(session.getReceipt()?.text);
  expect(document.querySelector("a[download]")).toBeNull();

  const print = vi.spyOn(window, "print").mockImplementation(() => {});
  fireEvent.click(screen.getByRole("button", { name: "Print or save as PDF" }));
  expect(print).toHaveBeenCalledTimes(1);
});
