// A caller is compared through the relation its changed callees keep: a proved summary of each callee is used at
// the call sites instead of the two bodies, and a recursive function is proved by that summary as its induction premise.

// changed, same behaviour, recursive: proved by induction on its fuel
export function fact(n: number): number {
  if (n <= 0) return 1;
  return n * fact(n - 1);
}

// unchanged text: proved through the summary of fact
export function useFact(n: number): number {
  return fact(n) + 1;
}

// changed behaviour: its own inputs show it
export function scale(x: number): number {
  return x * 2;
}

// unchanged text: rests on scale, which is not proved; lane B witnesses through it
export function useScale(n: number): number {
  return scale(n) + 1;
}

// changed only at one input, which generated inputs do not reach
export function rare(x: number): number {
  return x + 1;
}

// unchanged text: rests on rare, which is not proved, so it is not proved either
export function useRare(n: number): number {
  return rare(n) * 2;
}

// changed, same behaviour, mutually recursive: proved together by induction on the fuel
export function isEven(n: number): boolean {
  if (n <= 0) return true;
  return isOdd(n - 1);
}
export function isOdd(n: number): boolean {
  if (n <= 0) return false;
  return isEven(n - 1);
}

// untouched
export function double(x: number): number {
  return x * 2;
}
