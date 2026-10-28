// expect: hook-order migration
import { useState } from 'react';
export function Counter(enabled: boolean): number {
  if (enabled) {
    const [count] = useState(0);
    return count;
  }
  return 0;
}
