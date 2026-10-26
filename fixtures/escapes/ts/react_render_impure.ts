// expect: render-impure
import { useState } from "react";
let renders = 0;
export function counted(x: number): number {
  const [count] = useState(0);
  renders++;
  return count + x;
}
