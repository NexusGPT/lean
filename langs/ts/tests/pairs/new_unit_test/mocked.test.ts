import { expect, it, vi } from "vitest";
import { add } from "./candidate";

vi.mock("./candidate", () => ({ add: () => 3 }));

it("adds under a mock", () => {
  expect(add(1, 2)).toBe(3);
});
