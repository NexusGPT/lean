import { describe, expect, it } from "vitest";
import { add, mul, stamp } from "./candidate";

const twice = (x: number) => mul(x, 2);

describe("math", () => {
  it("adds", () => {
    expect(add(1, 2)).toBe(3);
  });
  it("multiplies", () => {
    expect(mul(3, 4)).toEqual(12);
    expect(twice(5)).toBe(10);
  });
  it.each([[1, 1], [2, 4], [3, 9]])("squares %i", (x, y) => {
    expect(mul(x, x)).toBe(y);
  });
});

describe("clock", () => {
  it("is a fixed instant", () => {
    expect(stamp()).toBe(0);
  });
});
