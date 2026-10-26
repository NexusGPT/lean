// React-tRace scenario 8: an effect sets the state once, so the component renders twice and the effect runs twice.
// expect-prints: 2
import React, { useState, useEffect } from "react";
import { print } from "probe";
export function C() {
  const [s, setS] = useState(() => 42);
  const x = 0;
  useEffect(() => { print(""); if (s !== x) { setS(() => x); } });
  return <div>{s}</div>;
}
