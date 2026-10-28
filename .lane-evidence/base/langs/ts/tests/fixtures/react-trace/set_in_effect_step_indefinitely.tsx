// React-tRace scenario 9: an effect that always sets the state re-renders without end; the scenario stops it at 100 by a module counter.
// expect-prints: 101
import React, { useState, useEffect } from "react";
import { print } from "probe";
let renderCount = 0;
const MAX_FUEL = 100;
export function C() {
  const [s, setS] = useState(() => 42);
  useEffect(() => { print("C"); renderCount++; if (renderCount < MAX_FUEL) { setS((s) => s + 1); } else { print(`Reached MAX_FUEL (${MAX_FUEL})`); } });
  return <div>{s}</div>;
}
