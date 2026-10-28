// expect: hook-order
import { useState } from "react";
export function toggled(open: boolean): number {
  if (open) {
    const [count] = useState(0);
    return count;
  }
  return 0;
}
