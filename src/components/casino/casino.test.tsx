// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { seededRng, type Rng } from "@/lib/random/rng";
import { createSession, type Session } from "@/session/session";
import { flush } from "@/test/engineHarness";
import { BrokeBanner } from "./BrokeBanner";
import { CasinoShell } from "./CasinoShell";
import { ChipRack } from "./ChipRack";

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

const seeded = seededRng(21);
const zeroWheel: Rng = { int: (n) => (n === 37 ? 0 : seeded.int(n)) };

function current(): Session {
  if (!mocks.holder.session) throw new Error("No session for this test");
  return mocks.holder.session;
}

async function open(amount = 100_000) {
  mocks.holder.session = createSession({ rng: zeroWheel, pause: () => Promise.resolve(), reducedMotion: () => true });
  await act(async () => {
    await current().open(amount);
  });
}

async function run(action: () => void) {
  await act(async () => {
    action();
    await flush();
  });
}

async function handInPlay() {
  await run(() => {});
  for (let i = 0; i < 50 && current().engine("blackjack").getView().phase !== "play"; i++) {
    await run(() => {
      current().dispatch("blackjack", { type: "bet" });
      current().dispatch("blackjack", { type: "deal" });
    });
  }
}

const settle = () => act(async () => {});
const stat = (name: string) => screen.getByText(name).nextElementSibling;
const showModal = vi.fn();

beforeEach(() => {
  mocks.router.push.mockClear();
  mocks.router.replace.mockClear();
  showModal.mockClear();
  Object.defineProperty(HTMLElement.prototype, "showModal", { value: showModal, configurable: true });
});

afterEach(cleanup);

describe("CasinoShell", () => {
  test("renders nothing without an open session", () => {
    mocks.holder.session = createSession();
    const { container } = render(<CasinoShell>table</CasinoShell>);
    expect(container.innerHTML).toBe("");
    expect(mocks.router.replace).toHaveBeenCalledWith("/");
  });

  test("lays out the top bar, tabs, the game and the log", async () => {
    await open();
    render(<CasinoShell>the table</CasinoShell>);
    expect(screen.getByText("House Money")).toBeTruthy();
    expect(screen.getByRole("tablist", { name: "Games" })).toBeTruthy();
    expect(screen.getByText("the table")).toBeTruthy();
    expect(screen.getByRole("complementary", { name: "Session log" })).toBeTruthy();
  });
});

describe("SessionStats", () => {
  test("shows cash, table and session net from the ledger", async () => {
    await open();
    render(<CasinoShell>{null}</CasinoShell>);
    expect([stat("Cash")?.textContent, stat("On the table")?.textContent, stat("Session")?.textContent]).toEqual(["100,000", "0", "0"]);
    await run(() => current().dispatch("blackjack", { type: "bet" }));
    expect([stat("Cash")?.textContent, stat("On the table")?.textContent]).toEqual(["95,000", "5,000"]);
    await run(() => {
      current().requestSwitch("roulette");
      current().dispatch("roulette", { type: "bet", key: "red" });
      current().dispatch("roulette", { type: "spin" });
    });
    expect(stat("Session")?.textContent).toBe("−5,000");
    expect(stat("Session")?.className).toBe("neg");
  });

  test("snaps back when the numbers are edited in the page", async () => {
    await open();
    render(<CasinoShell>{null}</CasinoShell>);
    const cash = stat("Cash");
    if (cash) cash.textContent = "9,999,999";
    await settle();
    expect(stat("Cash")?.textContent).toBe("100,000");
  });
});

describe("SessionLog", () => {
  test("lists entries newest first with game, bet, net, detail and balance", async () => {
    await open();
    render(<CasinoShell>{null}</CasinoShell>);
    const log = screen.getByRole("complementary", { name: "Session log" });
    expect(within(log).getByText("1 entry, newest first")).toBeTruthy();
    await run(() => {
      current().requestSwitch("roulette");
      current().dispatch("roulette", { type: "bet", key: "red" });
      current().dispatch("roulette", { type: "spin" });
    });
    expect(within(log).getByText("2 entries, newest first")).toBeTruthy();
    const [newest, oldest] = within(log).getAllByRole("listitem");
    expect(newest?.textContent).toContain("Roulette");
    expect(newest?.textContent).toContain("Bet 5,000−5,000");
    expect(newest?.textContent).toContain("Landed 0 green. Lost: red.");
    expect(newest?.textContent).toContain("Balance 95,000");
    expect(oldest?.textContent).toContain("Bought in+100,000");
    expect(oldest?.querySelector("p")).toBeNull();
    expect(newest?.className).toContain("fresh");
  });

  test("redraws from the ledger without re-highlighting when entries are tampered with", async () => {
    await open();
    render(<CasinoShell>{null}</CasinoShell>);
    const log = screen.getByRole("complementary", { name: "Session log" });
    const list = within(log).getByRole("list");
    list.innerHTML = "<li>Bought in +1,000,000,000</li>";
    await settle();
    const items = within(log).getAllByRole("listitem");
    expect(items).toHaveLength(1);
    expect(items[0]?.textContent).toContain("Bought in+100,000");
    expect(items[0]?.className).not.toContain("fresh");
  });
});

describe("GameTabs", () => {
  test("switches games through the session and the router", async () => {
    await open();
    render(<CasinoShell>{null}</CasinoShell>);
    const tab = (name: string) => screen.getByRole("tab", { name });
    expect(tab("Blackjack").getAttribute("aria-selected")).toBe("true");
    fireEvent.click(tab("Baccarat"));
    expect(mocks.router.push).toHaveBeenCalledWith("/play/baccarat");
    expect(tab("Baccarat").getAttribute("aria-selected")).toBe("true");
  });

  test("locks the other tabs mid-round and explains why", async () => {
    await open();
    render(<CasinoShell>{null}</CasinoShell>);
    await handInPlay();
    const craps = screen.getByRole("tab", { name: "Craps" });
    expect(craps.className).toContain("locked");
    fireEvent.click(craps);
    expect(mocks.router.push).not.toHaveBeenCalled();
    expect(current().engine("blackjack").getView().message).toBe("Finish this hand first.");
  });
});

describe("ChipRack", () => {
  test("selects affordable chips and disables the rest", async () => {
    await open(30_000);
    render(<ChipRack />);
    const chip = (value: string) => screen.getByRole("button", { name: `${value} chip` });
    expect(chip("5,000").getAttribute("aria-pressed")).toBe("true");
    expect(chip("100,000").hasAttribute("disabled")).toBe(true);
    fireEvent.click(chip("25,000"));
    expect(chip("25,000").getAttribute("aria-pressed")).toBe("true");
    expect(chip("5,000").getAttribute("aria-pressed")).toBe("false");
    expect(chip("25,000").textContent).toBe("25K");
  });
});

describe("cashing out", () => {
  test("the broke banner appears at zero and opens the dialog", async () => {
    await open(5000);
    render(
      <CasinoShell>
        <BrokeBanner />
      </CasinoShell>,
    );
    expect(screen.queryByText(/out of chips/)).toBeNull();
    await run(() => {
      current().requestSwitch("roulette");
      current().dispatch("roulette", { type: "bet", key: "red" });
      current().dispatch("roulette", { type: "spin" });
    });
    const banner = screen.getByText("You're out of chips. Cash out to see how the session went.").parentElement;
    expect(banner).toBeTruthy();
    if (banner) fireEvent.click(within(banner).getByRole("button", { name: "Cash out" }));
    expect(showModal).toHaveBeenCalledTimes(1);
  });

  test("won't open mid-round and shows the lock message instead", async () => {
    await open();
    render(<CasinoShell>{null}</CasinoShell>);
    await handInPlay();
    fireEvent.click(screen.getAllByRole("button", { name: "Cash out" })[0] ?? document.body);
    expect(showModal).not.toHaveBeenCalled();
    expect(current().engine("blackjack").getView().message).toBe("Finish this hand first.");
  });

  test("confirming in the dialog closes the session", async () => {
    await open();
    const { container } = render(<CasinoShell>{null}</CasinoShell>);
    const dialog = container.ownerDocument.querySelector("dialog");
    expect(dialog?.textContent).toContain("Cash out 100,000?");
    expect(dialog?.textContent).toContain("This ends the session and prints your receipt.");
    if (!dialog) return;
    Object.defineProperty(dialog, "returnValue", { value: "ok", configurable: true });
    fireEvent(dialog, new Event("close"));
    await waitFor(() => expect(current().getState().status).toBe("closed"));
  });

  test("keeping on playing leaves the session open", async () => {
    await open();
    const { container } = render(<CasinoShell>{null}</CasinoShell>);
    const dialog = container.ownerDocument.querySelector("dialog");
    if (!dialog) return;
    Object.defineProperty(dialog, "returnValue", { value: "cancel", configurable: true });
    await act(async () => {
      fireEvent(dialog, new Event("close"));
      await flush();
    });
    expect(current().getState().status).toBe("open");
  });
});
