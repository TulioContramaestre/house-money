// @vitest-environment jsdom
import { renderHook } from "@testing-library/react";
import { expect, test } from "vitest";
import { useFreshAfter } from "./useFreshAfter";

test("marks only what arrived since the last change, starting from the mount", () => {
  const { result, rerender } = renderHook(({ latest }) => useFreshAfter(latest), { initialProps: { latest: 4 } });
  expect(result.current).toBe(4);
  rerender({ latest: 6 });
  expect(result.current).toBe(4);
  rerender({ latest: 6 });
  expect(result.current).toBe(4);
  rerender({ latest: 7 });
  expect(result.current).toBe(6);
  rerender({ latest: 0 });
  expect(result.current).toBe(0);
  rerender({ latest: 8 });
  expect(result.current).toBe(0);
});
