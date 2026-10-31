/// <reference path="./types.d.ts" />
// notes: a module whose comments change while one function's body changes too
export const banner = `first line
// a template line that looks like a comment
last line`;

/*
 * the block comment: its middle line changes
 * and this line stays
 */
export function bump(x: number): number {
  return x + 1;
}

// counts calls
export class Counter {
  count = 0;
  hit(): number {
    this.count += 1;
    return this.count;
  }
  // resets the count
  reset(): void {
    this.count = 0;
  }
}
