/// <reference path="./other.d.ts" />
// added: a line comment at the top of the file
// notes: a module whose comments change while one function's body changes too
export const banner = `first line
// a template line that looks like a comment, now changed
last line`;

/*
 * the block comment: its middle line changed
 * and this line stays
 */
export function bump(x: number): number {
  return x + 2;
}


// counts calls, said again
export class Counter {
  count = 0;
  hit(): number {
    this.count += 1;
    return this.count;
  }
  // a comment added between two methods
  // resets the count
  reset(): void {
    this.count = 0;
  }
}
