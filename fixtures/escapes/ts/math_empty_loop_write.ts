// expect: math-empty
// the list is tested before the loop, but the loop shortens it after the call: the next pass can spread an empty list
export function drain(xs: number[]): number {
  let total = 0;
  if (xs.length === 0) return 0;
  for (let i = 0; i < 3; i++) {
    total += Math.max(...xs);
    xs.pop();
  }
  return total;
}
