// type_assertions: `e as T` checks nothing at run time; a narrowing assertion is refused (type-assertion), one to a type
// its source is assignable to passes the value through with its real type and is read
export type Mode = "a" | "b";
export type Wide = "a" | "b" | "c";

// any narrowed to number without the keyword: a string flows on, so `+ 0` appends "0"
export function anyAs(x: any): number {
  const n: number = x;
  return n;
}

// a union asserted to one member: a string flows on, so `+ 0` appends "0"
export function asCast(x: string | number): number {
  return x as number;
}

// unknown asserted to string: a number flows on, so `+ ""` turns it into a string
export function unknownAs(x: unknown): string {
  return x as string;
}

// any asserted to a record: the parsed value may lack the field or hold another type in it
export function parsedA(s: string): number {
  const o = JSON.parse(s) as { a: number };
  return o.a;
}

// a string literal union narrowed: an exhaustive switch reads "c" as one of its cases
export function modeCode(s: Wide): number {
  const m = s as Mode;
  switch (m) {
    case "a": return 1;
    case "b": return 2;
  }
}

// an assertion to a supertype: the string passes through
export function widen(x: string): string | number {
  return x as string | number;
}

// an assertion within a literal union, from a member to the union: the value passes through
export function rank(m: Mode): number {
  const w = m as Wide;
  return w === "a" ? 1 : w === "b" ? 2 : 3;
}

// no assertion
export function plain(x: number): number {
  return x + 1;
}
