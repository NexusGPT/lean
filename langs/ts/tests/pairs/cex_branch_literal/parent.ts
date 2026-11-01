// The tier a customer id falls in.
export function classify(id: bigint): string {
  if (id < 0n) return 'invalid';
  return 'standard';
}
