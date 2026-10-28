// The reverse of prelude_unit: the candidate adds a unit with a float literal, which the parent file does not have.
// The units that reach nothing of it read their numbers as they did and keep their proof.
export function balance(entries: number[]): number {
  return entries.reduce((total, entry) => total + entry, 0);
}

export function tag(n: number): string {
  return "n=" + n;
}
