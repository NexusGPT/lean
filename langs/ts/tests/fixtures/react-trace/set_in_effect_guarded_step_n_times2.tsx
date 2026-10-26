// React-tRace scenario 8: an effect steps the state up to 25; 26 renders, 26 effect runs.
// expect-prints: 26
import React, { useState, useEffect } from "react";
import { print } from "probe";
export function C() {
  const [s, setS] = useState(() => 0);
  useEffect(() => { print(""); if (s < 25) { setS((s) => s + 1); } });
  return <div role="counter">{s}</div>;
}
