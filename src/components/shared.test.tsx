// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";
import { hand } from "@/test/stackedShoe";
import { CardRow } from "./cards/CardRow";
import { Die } from "./dice/Die";
import { MessageLine } from "./table/MessageLine";
import { RulesButton } from "./table/RulesButton";
import { SeatLabel } from "./table/SeatLabel";
import { BetSpot } from "./ui/BetSpot";
import { Button } from "./ui/Button";
import { Dialog } from "./ui/Dialog";
import { OutcomeBadge } from "./ui/OutcomeBadge";
import { StakeMarker } from "./ui/StakeMarker";

afterEach(cleanup);

describe("Button", () => {
  test("uses aria-disabled and swallows clicks while disabled", () => {
    const onClick = vi.fn();
    const { rerender } = render(
      <Button primary disabled onClick={onClick}>
        Deal
      </Button>,
    );
    const button = screen.getByRole("button", { name: "Deal" });
    expect(button.getAttribute("aria-disabled")).toBe("true");
    expect(button.hasAttribute("disabled")).toBe(false);
    expect(button.className).toBe("btn primary");
    fireEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
    rerender(<Button onClick={onClick}>Deal</Button>);
    expect(button.hasAttribute("aria-disabled")).toBe(false);
    fireEvent.click(button);
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});

describe("OutcomeBadge", () => {
  test.each([
    [7500, "Blackjack", "Blackjack +7,500", "win"],
    [-5000, "Bust", "Bust −5,000", "loss"],
    [0, "Push", "Push ", "push"],
    [5000, undefined, "+5,000", "win"],
    [0, undefined, "Push", "push"],
  ])("net %d label %s → %j", (net, label, text, tone) => {
    const { container } = render(<OutcomeBadge net={net} label={label} />);
    const badge = container.firstElementChild;
    expect(badge?.textContent).toBe(text);
    expect(badge?.classList.contains(tone)).toBe(true);
  });
});

describe("StakeMarker", () => {
  test("shows nothing for an empty bet", () => {
    const { container } = render(<StakeMarker amount={0} />);
    expect(container.innerHTML).toBe("");
  });

  test("labels the chip with the full amount and shows the short one", () => {
    render(<StakeMarker amount={25_000} size="large" />);
    const chip = screen.getByLabelText("25,000 on this bet");
    expect(chip.textContent).toBe("25K");
    expect(chip.className).toBe("face stakeLarge c25");
  });
});

describe("BetSpot", () => {
  test("is a labelled button showing its stake and result", () => {
    const onClick = vi.fn();
    render(
      <BetSpot name="Player" pay="1 to 1" label="Bet on Player, pays 1 to 1" stake={5000} outcome={0} won onClick={onClick} />,
    );
    const spot = screen.getByRole("button", { name: "Bet on Player, pays 1 to 1" });
    expect(spot.textContent).toBe("Player1 to 15KPush");
    expect(spot.classList.contains("won")).toBe(true);
    fireEvent.click(spot);
    expect(onClick).toHaveBeenCalled();
  });

  test("dims closed spots", () => {
    render(<BetSpot name="Odds" pay="x" label="Odds" stake={0} closed onClick={() => {}} />);
    expect(screen.getByRole("button", { name: "Odds" }).classList.contains("closed")).toBe(true);
  });
});

describe("CardRow", () => {
  test("shows two empty slots before the deal", () => {
    const { container } = render(<CardRow cards={[]} />);
    expect(container.querySelectorAll(".slot")).toHaveLength(2);
  });

  test("draws faces, the hole card face down, and deals only new cards", () => {
    const cards = hand("A♠ 10♥ K♦");
    render(<CardRow cards={cards} hidden={1} freshAfter={1} />);
    const ace = screen.getByRole("img", { name: "A♠" });
    const hole = screen.getByRole("img", { name: "Face-down card" });
    const king = screen.getByRole("img", { name: "K♦" });
    expect(ace.classList.contains("fresh")).toBe(false);
    expect(hole.classList.contains("fresh")).toBe(true);
    expect(king.classList.contains("red")).toBe(true);
    expect(ace.textContent).toBe("A♠♠A♠");
  });
});

describe("Die", () => {
  test("shows pips for its face", () => {
    const { container } = render(<Die value={5} tumbling />);
    expect(screen.getByRole("img", { name: "5" }).classList.contains("tumble")).toBe(true);
    expect(container.querySelectorAll("i")).toHaveLength(9);
    expect(container.querySelectorAll("i.on")).toHaveLength(5);
  });

  test("is an empty outline before the first roll", () => {
    const { container } = render(<Die value={null} />);
    expect(container.firstElementChild?.className).toBe("die empty");
  });
});

describe("table text", () => {
  test("the message line is polite live text", () => {
    render(<MessageLine message="Rolled 7. A natural. Pass wins." />);
    expect(screen.getByText("Rolled 7. A natural. Pass wins.").getAttribute("aria-live")).toBe("polite");
  });

  test("seat labels show a total pill only when there is one", () => {
    const { container, rerender } = render(<SeatLabel name="Dealer" total="" />);
    expect(container.textContent).toBe("Dealer");
    rerender(<SeatLabel name="Banker" total={0} />);
    expect(container.querySelector(".total")?.textContent).toBe("0");
  });
});

describe("RulesButton", () => {
  test("opens a dialog named for the game, focused at the top of its rules", () => {
    const showModal = vi.fn(function (this: HTMLDialogElement) {
      this.setAttribute("open", "");
    });
    Object.defineProperty(HTMLElement.prototype, "showModal", { value: showModal, configurable: true });
    render(
      <RulesButton game="Test">
        <h3>Goal</h3>
      </RulesButton>,
    );
    expect(screen.queryByRole("dialog")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "How to play Test" }));
    expect(showModal).toHaveBeenCalledTimes(1);
    const dialog = screen.getByRole("dialog", { name: "How to play Test" });
    expect(within(dialog).getByRole("heading", { level: 3, name: "Goal" })).toBeTruthy();
    expect(document.activeElement).toBe(dialog.querySelector(".rules"));
    expect(within(dialog).getByRole("button", { name: "Got it" }).getAttribute("type")).toBe("submit");
    expect(within(dialog).getByRole("button", { name: "Close" }).getAttribute("type")).toBe("submit");
  });
});

describe("Dialog", () => {
  const outside = { clientX: 10, clientY: 10 };
  const inside = { clientX: 150, clientY: 150 };

  function renderDialog(dismissible: boolean) {
    const close = vi.fn();
    Object.defineProperty(HTMLElement.prototype, "close", { value: close, configurable: true });
    render(
      <Dialog title="Rules" dismissible={dismissible} actions={null}>
        <p>Body</p>
      </Dialog>,
    );
    const dialog = document.querySelector("dialog");
    if (!dialog) throw new Error("No dialog");
    vi.spyOn(dialog, "getBoundingClientRect").mockReturnValue({ left: 100, top: 100, right: 300, bottom: 300 } as DOMRect);
    return { dialog, close };
  }

  test("a dismissible dialog closes on a press and release outside it", () => {
    const { dialog, close } = renderDialog(true);
    fireEvent.pointerDown(dialog, outside);
    fireEvent.click(dialog, outside);
    expect(close).toHaveBeenCalledTimes(1);
  });

  test("clicks inside it, and drags that end outside it, leave it open", () => {
    const { dialog, close } = renderDialog(true);
    fireEvent.pointerDown(dialog, inside);
    fireEvent.click(dialog, inside);
    fireEvent.pointerDown(screen.getByText("Body"), inside);
    fireEvent.click(dialog, outside);
    expect(close).not.toHaveBeenCalled();
  });

  test("other dialogs have no close button and ignore clicks outside", () => {
    const { dialog, close } = renderDialog(false);
    fireEvent.pointerDown(dialog, outside);
    fireEvent.click(dialog, outside);
    expect(close).not.toHaveBeenCalled();
    expect(dialog.querySelector('button[aria-label="Close"]')).toBeNull();
  });
});
