// @vitest-environment jsdom
import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, test } from "vitest";
import { useDomGuard } from "./useDomGuard";

const TEXT: MutationObserverInit = { subtree: true, childList: true, characterData: true };
const WITH_ATTRIBUTES: MutationObserverInit = { ...TEXT, attributes: true };

function Guarded({ value, options = TEXT }: { value: string; options?: MutationObserverInit }) {
  const { key, watch } = useDomGuard(options);
  return (
    <p key={key} ref={watch} data-testid="guarded">
      <span>{value}</span>
    </p>
  );
}

const settle = () => act(async () => {});

afterEach(cleanup);

test("redraws after someone else replaces the text", async () => {
  render(<Guarded value="1,000" />);
  const before = screen.getByTestId("guarded");
  before.textContent = "9,999,999";
  await settle();
  const after = screen.getByTestId("guarded");
  expect(after).not.toBe(before);
  expect(after.textContent).toBe("1,000");
});

test("redraws after a text node is edited in place", async () => {
  render(<Guarded value="1,000" />);
  const text = screen.getByText("1,000").firstChild;
  if (text) text.nodeValue = "1,000,000";
  await settle();
  expect(screen.getByTestId("guarded").textContent).toBe("1,000");
});

test("keeps watching after a redraw", async () => {
  render(<Guarded value="1,000" />);
  screen.getByTestId("guarded").textContent = "x";
  await settle();
  screen.getByTestId("guarded").textContent = "y";
  await settle();
  expect(screen.getByTestId("guarded").textContent).toBe("1,000");
});

test("ignores React's own updates", async () => {
  const { rerender } = render(<Guarded value="1,000" />);
  const node = screen.getByTestId("guarded");
  rerender(<Guarded value="2,000" />);
  await settle();
  expect(screen.getByTestId("guarded")).toBe(node);
  expect(node.textContent).toBe("2,000");
});

test("watches attributes only when asked", async () => {
  render(<Guarded value="1" />);
  const plain = screen.getByTestId("guarded");
  plain.setAttribute("class", "hacked");
  await settle();
  expect(screen.getByTestId("guarded")).toBe(plain);
  cleanup();

  render(<Guarded value="1" options={WITH_ATTRIBUTES} />);
  const watched = screen.getByTestId("guarded");
  watched.setAttribute("class", "hacked");
  await settle();
  expect(screen.getByTestId("guarded")).not.toBe(watched);
  expect(screen.getByTestId("guarded").hasAttribute("class")).toBe(false);
});
