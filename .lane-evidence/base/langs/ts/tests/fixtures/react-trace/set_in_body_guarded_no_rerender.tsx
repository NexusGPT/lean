// React-tRace scenario 4: a guarded setter during render re-renders at once; the effect runs after the last render only.
// expect-prints: 1
import React, { useState, useEffect } from "react";
import { print } from "probe";
export function C() {
  const [s, setS] = useState(() => 42);
  if (s === 42) { setS((s) => 43); }
  useEffect(() => { print(""); });
  return <div>{s}</div>;
}
