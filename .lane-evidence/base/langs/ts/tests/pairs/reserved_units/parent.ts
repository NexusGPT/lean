// Units whose names TypeScript allows and Dafny reserves: label, print, map and type. The translator writes each as
// its name with a trailing underscore (label_), and theorem.py writes its lemma the same way (Equal_label_).
import { save } from './store';

// label: an outside call, then a sum
export function label(x: number): number {
  save(x);
  return x + 1;
}

// print: a bracketed string
export function print(s: string): string {
  return '[' + s + ']';
}

// map: every element doubled
export function map(xs: number[]): number[] {
  return xs.map((x) => x * 2);
}

// type: a caller of map, so a call site names a reserved unit too
export function type(xs: number[]): number {
  return map(xs).length;
}
