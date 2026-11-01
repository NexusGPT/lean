import { expect, it } from "vitest";
import { mul } from "./candidate";

// Response is a global Node holds and lean's sandbox does not: the failure is lean's, never the unit's (coverage)
it("answers through a Response", () => {
  const r = new Response(null, { status: 204 });
  expect(mul(r.status, 1)).toBe(204);
});
