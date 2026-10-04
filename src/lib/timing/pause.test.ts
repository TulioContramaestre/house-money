import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { createPause } from "./pause";

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

test("waits the full time when motion is allowed", async () => {
  const done = vi.fn();
  void createPause(() => false)(450).then(done);
  await vi.advanceTimersByTimeAsync(449);
  expect(done).not.toHaveBeenCalled();
  await vi.advanceTimersByTimeAsync(1);
  expect(done).toHaveBeenCalled();
});

test("caps pauses at 80 ms when motion is reduced", async () => {
  const done = vi.fn();
  void createPause(() => true)(450).then(done);
  await vi.advanceTimersByTimeAsync(80);
  expect(done).toHaveBeenCalled();
});

test("keeps shorter pauses short when motion is reduced", async () => {
  const done = vi.fn();
  void createPause(() => true)(70).then(done);
  await vi.advanceTimersByTimeAsync(70);
  expect(done).toHaveBeenCalled();
});
