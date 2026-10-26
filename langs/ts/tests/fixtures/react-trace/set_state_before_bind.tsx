// React-tRace scenario 2: setters during render with a setter stored in state; the exact print sequence of the retries.
// expect-prints: [0,0,1,1,2,1,3,1]
import React, { useState } from "react";
import { print } from "probe";
export function C() {
  const [setter, setSetter] = useState<any>(() => null);
  const [r, setRender] = useState(() => 0);
  if (r < 3) { setRender((r) => r + 1); }
  if (setter !== null && r < 3) { setter(() => 1); }
  const [value, setValue] = useState(() => 0);
  if (setter === null && r < 3) { setSetter(() => setValue); }
  print(r);
  print(value);
  return <div>{value}</div>;
}
