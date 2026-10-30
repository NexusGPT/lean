// faithful_held: the faithful number reading (translate/faithful.mjs) reads a held value with its real type. An any value
// asserted to number is no number to it, so `(x as number) + 1` is not the commutative double sum: "a" + 1 is "a1"
export function heldSum(x: any): string {
  return `${1 + (x as number)}`;
}

// the same held sum as the unit's number result
export function heldNum(x: any): number {
  return 1 + (x as number);
}

// a number asserted to a literal union is held at its own family, number: the sum commutes and is proved
export function familySum(n: number, m: number): number {
  return m + (n as 1 | 2);
}

// no assertion: the double sum commutes
export function plainSum(a: number, b: number): number {
  return b + a;
}
