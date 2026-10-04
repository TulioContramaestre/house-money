// @vitest-environment jsdom
import { act, cleanup, renderHook } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { seededRng } from "@/lib/random/rng";
import { flush } from "@/test/engineHarness";
import {
  useActivateGame,
  useLeaveWarning,
  useRedirectToActiveGame,
  useRequireClosedSession,
  useRequireIdleSession,
  useRequireOpenSession,
} from "./guards";
import { useChip, useLedgerSnapshot } from "./hooks";
import { createSession, type Session } from "./session";

const mocks = vi.hoisted(() => {
  const holder: { session?: Session } = {};
  const router = { replace: vi.fn(), push: vi.fn() };
  return { holder, router };
});

vi.mock("next/navigation", () => ({ useRouter: () => mocks.router }));

vi.mock("./session", async (importOriginal) => {
  const real = await importOriginal<typeof import("./session")>();
  return {
    ...real,
    get session() {
      if (!mocks.holder.session) throw new Error("No session for this test");
      return mocks.holder.session;
    },
  };
});

function current(): Session {
  if (!mocks.holder.session) throw new Error("No session for this test");
  return mocks.holder.session;
}

async function openSession(amount = 100_000) {
  await act(async () => {
    await current().open(amount);
  });
}

async function closeSession() {
  await openSession();
  await act(async () => {
    await current().confirmCashOut();
  });
}

beforeEach(() => {
  mocks.holder.session = createSession({ rng: seededRng(3), pause: () => Promise.resolve(), reducedMotion: () => true });
  mocks.router.replace.mockClear();
});

afterEach(cleanup);

describe("route guards", () => {
  test("the casino sends a visitor with no session to the buy-in", () => {
    const { result } = renderHook(() => useRequireOpenSession());
    expect(result.current).toBe(false);
    expect(mocks.router.replace).toHaveBeenCalledWith("/");
  });

  test("the casino renders for an open session", async () => {
    await openSession();
    const { result } = renderHook(() => useRequireOpenSession());
    expect(result.current).toBe(true);
    expect(mocks.router.replace).not.toHaveBeenCalled();
  });

  test("the casino sends a closed session to its receipt", async () => {
    await closeSession();
    renderHook(() => useRequireOpenSession());
    expect(mocks.router.replace).toHaveBeenCalledWith("/receipt");
  });

  test("the buy-in shows while idle and moves on once the session opens", async () => {
    const { result } = renderHook(() => useRequireIdleSession());
    expect(result.current).toBe(true);
    await openSession();
    expect(result.current).toBe(false);
    expect(mocks.router.replace).toHaveBeenCalledWith("/play");
  });

  test("the receipt needs a closed session", async () => {
    const idle = renderHook(() => useRequireClosedSession());
    expect(idle.result.current).toBe(false);
    expect(mocks.router.replace).toHaveBeenCalledWith("/");
    await closeSession();
    expect(renderHook(() => useRequireClosedSession()).result.current).toBe(true);
  });

  test("/play forwards to the active game", async () => {
    await openSession();
    renderHook(() => useRedirectToActiveGame());
    expect(mocks.router.replace).toHaveBeenCalledWith("/play/blackjack");
  });

  test("guarded screens render nothing on the server, the buy-in renders", async () => {
    await openSession();
    function Casino() {
      return useRequireOpenSession() ? <p>casino</p> : null;
    }
    expect(renderToString(<Casino />)).toBe("");
    mocks.holder.session = createSession();
    function BuyIn() {
      return useRequireIdleSession() ? <p>buy-in</p> : null;
    }
    expect(renderToString(<BuyIn />)).toBe("<p>buy-in</p>");
  });
});

describe("useActivateGame", () => {
  test("switches to the game in the URL", async () => {
    await openSession();
    renderHook(() => useActivateGame("craps"));
    expect(current().getState().activeGame).toBe("craps");
    expect(mocks.router.replace).not.toHaveBeenCalled();
  });

  test("sends the back button back to a locked game", async () => {
    await openSession();
    await act(async () => {
      for (let i = 0; i < 50 && current().engine("blackjack").getView().phase !== "play"; i++) {
        current().dispatch("blackjack", { type: "bet" });
        current().dispatch("blackjack", { type: "deal" });
        await flush();
      }
    });
    renderHook(() => useActivateGame("baccarat"));
    expect(mocks.router.replace).toHaveBeenCalledWith("/play/blackjack");
    expect(current().engine("blackjack").getView().message).toBe("Finish this hand first.");
  });
});

describe("useLeaveWarning", () => {
  const leave = () => {
    const event = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(event);
    return event.defaultPrevented;
  };

  test("warns only while a session is open", async () => {
    renderHook(() => useLeaveWarning());
    expect(leave()).toBe(false);
    await openSession();
    expect(leave()).toBe(true);
    await act(async () => {
      await current().confirmCashOut();
    });
    expect(leave()).toBe(false);
  });
});

describe("store hooks", () => {
  test("follow the ledger and the chip rack", async () => {
    await openSession(30_000);
    const ledger = renderHook(() => useLedgerSnapshot());
    const chips = renderHook(() => useChip());
    expect(ledger.result.current.cash).toBe(30_000);
    act(() => current().selectChip(25_000));
    expect(chips.result.current.selected).toBe(25_000);
    act(() => current().dispatch("blackjack", { type: "bet" }));
    expect(ledger.result.current).toMatchObject({ cash: 5000, onTable: 25_000 });
    expect(chips.result.current.selected).toBe(5000);
    expect(chips.result.current.chips.filter((c) => !c.disabled).map((c) => c.value)).toEqual([1000, 5000]);
  });
});
