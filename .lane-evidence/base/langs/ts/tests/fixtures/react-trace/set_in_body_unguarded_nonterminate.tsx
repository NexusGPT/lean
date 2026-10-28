// React-tRace scenario 3: an unguarded setter during render: React throws after 25 re-renders.
// expect-prints: error
import React, { useState } from "react";
import { print } from "probe";
export function C() {
  const [s, setS] = useState(() => 0);
  setS((s) => s + 1);
  print("");
  return <div>{s}</div>;
}
