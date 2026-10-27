// A conditional, an optional read or a default whose branches are an `any` value and an absent one: both branches are
// one Dafny type. An `any` holds undefined itself, so its absence is Any_undefined(), never None; an `any` value put in
// an optional slot may be that undefined, so the lift tests for it before it claims a present value.

interface Reply { data: any; status: number }
interface Failure { response?: Reply; message: string; extra?: any }

// an optional read ending in an `any` field: the absent branch is undefined in Any
export function payload(e: Failure): boolean {
  return e.response?.data === 0;
}

// a conditional of an `any` branch and an optional string branch
export function choose(b: boolean, e: Failure, note?: string): boolean {
  return (b ? e.response?.data : note) === undefined;
}

// an `any` value lifted into an optional string slot: undefined is the absent value
export function missing(v: any): boolean {
  const s: string | undefined = v;
  return s === undefined;
}

// a default taken when an `any` argument is undefined
function orFive(x: any = 5): any {
  return x;
}
export function isFive(y?: any): boolean {
  return orFive(y) === 5;
}

// untouched: an optional `any` field read, with a fallback
export function extraOr(e: Failure, fallback: number): boolean {
  return (e.extra ?? fallback) === fallback;
}

// a value stored as `unknown` read where a guard narrowed it to a number: one cast to the narrowed type
export function bump(x: unknown): number {
  return typeof x === "number" ? x + 1 : 0;
}
