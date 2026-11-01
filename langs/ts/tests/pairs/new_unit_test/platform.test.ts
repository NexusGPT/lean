import { expect, it } from "vitest";
import { mul } from "./candidate";

// BroadcastChannel is a global Node holds and lean's sandbox does not (Response was, until the web fakes of
// exec/fakes/web answered it): the failure is lean's, never the unit's (coverage)
it("answers through a BroadcastChannel", () => {
  const c = new BroadcastChannel("lean");
  expect(mul(c.name.length, 1)).toBe(4);
});
