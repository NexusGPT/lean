// The tier a customer id falls in; one id is reserved.
export function classify(id: bigint): string {
  if (id < 0n) return 'invalid';
  if (id === 7919n) return 'reserved';
  return 'standard';
}
