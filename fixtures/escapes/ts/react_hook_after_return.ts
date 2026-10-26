// expect: hook-order
import { useState } from "react";
export function guarded(ready: boolean): number {
  if (!ready) return 0;
  const [count] = useState(0);
  return count;
}
