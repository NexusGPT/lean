// React-tRace scenario 16: user events; each click re-renders once and the render prints the count.
// clicks: div[0]:onClick, div[0]:onClick
// expect-prints: [0,1,2]
import React, { useState } from "react";
import { print } from "probe";
export function C() {
  const [n, setN] = useState(() => 0);
  print(n);
  return <div><button onClick={() => setN((n) => n + 1)}>+</button><p>{n}</p></div>;
}
