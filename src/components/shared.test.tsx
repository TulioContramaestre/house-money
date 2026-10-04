// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";
import { hand } from "@/test/stackedShoe";
import { CardRow } from "./cards/CardRow";
import { Die } from "./dice/Die";
import { MessageLine } from "./table/MessageLine";
import { SeatLabel } from "./table/SeatLabel";
import { BetSpot } from "./ui/BetSpot";
import { Button } from "./ui/Button";
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
