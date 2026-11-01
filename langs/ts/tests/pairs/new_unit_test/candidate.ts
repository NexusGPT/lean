// Units no parent holds, with the tests the PR adds beside them (candidate.test.ts, design/w1h-new-units.md).

// its own test says add(1, 2) is 3: new:test
export function add(a: number, b: number): number {
  return a - b;
}

// its tests pass: no record
export function mul(a: number, b: number): number {
  return a * b;
}

// its test reads the clock lean answers: the failure rests on the world, so it is coverage, not new:test
export function stamp(): number {
  return Date.now();
}
