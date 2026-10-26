// React-tRace scenario 1: an effect without a setter runs once; no re-render.
// expect-prints: 1
import React, { useState, useEffect } from "react";
import { print } from "probe";
export function C() {
  const [s] = useState(() => 42);
  useEffect(() => { print(""); });
  return <div>{s}</div>;
}
