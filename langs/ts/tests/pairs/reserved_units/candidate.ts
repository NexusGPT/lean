// Units whose names TypeScript allows and Dafny reserves: label, print, map and type. The translator writes each as
// its name with a trailing underscore (label_), and theorem.py writes its lemma the same way (Equal_label_).
import { save } from './store';

// label: the same outside call, then the sum written the other way round
export function label(x: number): number {
  save(x);
  return 1 + x;
}

// print: a parenthesised string
export function print(s: string): string {
  return '(' + s + ')';
}

// map: every element doubled
export function map(xs: number[]): number[] {
  return xs.map((x) => x * 2);
}

// type: a caller of map, so a call site names a reserved unit too
export function type(xs: number[]): number {
  return map(xs).length;
}
