// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { seededRng, type Rng } from "@/lib/random/rng";
import { createSession, type Session } from "@/session/session";
import { settle } from "@/test/liveGame";
import { GameStage } from "./GameStage";

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

const seeded = seededRng(5);
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

const message = () => document.querySelector("[aria-live]")?.textContent;
const button = (name: string) => screen.getByRole("button", { name });

const showModal = vi.fn();

beforeEach(() => {
  mocks.router.replace.mockClear();
  showModal.mockClear();
  Object.defineProperty(HTMLElement.prototype, "showModal", { value: showModal, configurable: true });
});
afterEach(cleanup);

test("shows the active game's message, table, chips and actions", async () => {
  await open();
  render(<GameStage requestedId="blackjack" />);
  expect(message()).toBe("Pick a chip, then tap the bet circle.");
  expect(button("Add a 5,000 chip to your bet")).toBeTruthy();
  expect(screen.getByRole("group", { name: "Chip value" })).toBeTruthy();
  expect(button("Deal")).toBeTruthy();
});

test("plays through the session, using the chip from the rack", async () => {
  await open();
  render(<GameStage requestedId="blackjack" />);
  fireEvent.click(button("25,000 chip"));
  expect(button("Add a 25,000 chip to your bet").textContent).toBe("BetTap to add 25K");
  fireEvent.click(button("Add a 25,000 chip to your bet"));
  expect(message()).toBe("Betting 25,000. Deal when ready.");
  expect(current().getLedgerSnapshot().onTable).toBe(25_000);
});

test("opening another game's page switches the session to it", async () => {
  await open();
  render(<GameStage requestedId="roulette" />);
  expect(current().getState().activeGame).toBe("roulette");
  expect(message()).toBe("Place chips on the layout, then spin.");
  expect(screen.getAllByRole("button", { name: /^Bet on / })).toHaveLength(49);
  expect(mocks.router.replace).not.toHaveBeenCalled();
});

test("a locked game sends the page back to it and explains why", async () => {
  await open();
  const { rerender } = render(<GameStage requestedId="blackjack" />);
  for (let i = 0; i < 50 && current().engine("blackjack").getView().phase !== "play"; i++) {
    await settle(() => {
      current().dispatch("blackjack", { type: "bet" });
      current().dispatch("blackjack", { type: "deal" });
    });
  }
  rerender(<GameStage requestedId="craps" />);
  expect(mocks.router.replace).toHaveBeenCalledWith("/play/blackjack");
  expect(current().getState().activeGame).toBe("blackjack");
  expect(message()).toBe("Finish this hand first.");
  expect(button("Hit")).toBeTruthy();
});

test("the broke banner sits on the felt", async () => {
  await open(5000);
  render(<GameStage requestedId="roulette" />);
  fireEvent.click(button("Bet on red, pays 1 to 1"));
  await settle(() => fireEvent.click(button("Spin")));
  const banner = screen.getByText("You're out of chips. Cash out to see how the session went.");
  expect(banner.closest(".table")).toBeTruthy();
});

test("the rules button opens the active game's rules", async () => {
  await open();
  const { rerender } = render(<GameStage requestedId="blackjack" />);
  const dialog = () => document.querySelector("dialog")?.textContent;
  fireEvent.click(button("How to play Blackjack"));
  expect(showModal).toHaveBeenCalledTimes(1);
  expect(dialog()).toContain("pays 3 to 2");
  rerender(<GameStage requestedId="craps" />);
  expect(screen.queryByRole("button", { name: "How to play Blackjack" })).toBeNull();
  fireEvent.click(button("How to play Craps"));
  expect(showModal).toHaveBeenCalledTimes(2);
  expect(dialog()).toContain("Pass wins on 7 or 11");
  expect(dialog()).not.toContain("pays 3 to 2");
});
