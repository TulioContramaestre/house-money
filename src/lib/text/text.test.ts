import { expect, test } from "vitest";
import { cap, listJoin } from "./text";

test("cap uppercases the first letter only", () => {
  expect(cap("hit or stand")).toBe("Hit or stand");
  expect(cap("")).toBe("");
});

test("listJoin builds 'a, b or c'", () => {
  expect(listJoin([])).toBe("");
  expect(listJoin(["hit"])).toBe("hit");
  expect(listJoin(["hit", "stand"])).toBe("hit or stand");
  expect(listJoin(["hit", "stand", "double", "split"])).toBe("hit, stand, double or split");
});
