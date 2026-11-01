import { expect, it } from "vitest";
import { mul } from "./candidate";
import { sized } from "./helper";

// computed at load through a helper that asks the world: a handle, truthy, its test no trap
const factor = sized("x") ? 2 : 3;

it("scales by the fixture", () => {
  expect(mul(factor, 1)).toBe(3);
});
