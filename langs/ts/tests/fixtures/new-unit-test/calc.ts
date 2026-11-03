// a new exported function with two branches and a throw: three cases complete every statement
export function bucket(n: number, label: string): string {
  if (!Number.isFinite(n)) throw new Error(`not a number: ${label}`);
  if (n < 0) return `${label}:negative`;
  if (n === 0) return `${label}:zero`;
  return `${label}:positive(${Math.round(n)})`;
}
// a unit that returns a promise: the test awaits it
export async function later(n: number): Promise<number> { return n * 2 + 1; }
// a helper no import reaches: no test can call it from the repository's runner
function helper(x: number): number { return x + 1; }
export function usesHelper(x: number): number { return helper(x) * 2; }
