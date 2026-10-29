// expect: toplevel-state
// module state bound through a pattern
let { low, high } = { low: 1, high: 9 };

export function span(): number {
  return high - low;
}
