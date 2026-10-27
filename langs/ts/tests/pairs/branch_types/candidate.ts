// A conditional, an optional read or a default whose branches are an `any` value and an absent one: both branches are
// one Dafny type. An `any` holds undefined itself, so its absence is Any_undefined(), never None; an `any` value put in
// an optional slot may be that undefined, so the lift tests for it before it claims a present value.

interface Reply { data: any; status: number }
interface Failure { response?: Reply; message: string; extra?: any }

// refactor: the optional read written as a conditional on the receiver
export function payload(e: Failure): boolean {
  return (e.response == null ? undefined : e.response.data) === 0;
}

// changed: the absent note falls back to the message
export function choose(b: boolean, e: Failure, note?: string): boolean {
  return (b ? e.response?.data : (note ?? e.message)) === undefined;
}

// refactor: the undefined test made on the `any` value itself
export function missing(v: any): boolean {
  return v === undefined;
}

// changed: the default is no longer taken
function orFive(x: any = 5): any {
  return x;
}
export function isFive(y?: any): boolean {
  return y === 5;
}

// untouched: an optional `any` field read, with a fallback
export function extraOr(e: Failure, fallback: number): boolean {
  return (e.extra ?? fallback) === fallback;
}

// refactor: the same guard as a statement
export function bump(x: unknown): number {
  if (typeof x === "number") return x + 1;
  return 0;
}
