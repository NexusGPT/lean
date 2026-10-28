// expect: receiver-write
// a free function writing a field of a receiver declared as a dictionary: the receiver is not a record of declared
// fields; take the dictionary as a parameter and return the new one
export type Totals = { [key: string]: number };
export function count(this: Totals, key: string): number {
  this.all = (this.all ?? 0) + 1;
  return this.all;
}
