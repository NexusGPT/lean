// expect: dynamic-key
// a record with fields and a number index signature alone: a string index is read through the dictionary of undeclared
// keys the value carries (design/open-datatype.md); a number index has no such slot, so its entries stay outside the reading
export interface Row { label: string; [i: number]: string }
export function cellOf(r: Row, i: number): string {
  return r[i];
}
