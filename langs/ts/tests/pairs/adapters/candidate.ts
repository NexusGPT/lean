// A changed signature proves only through an adapter the developer declares: the theorem then compares the candidate
// on the adapted inputs with the parent on the original ones, f_candidate(A(x)) == f_parent(x).

// its two parameters swap places; the scope file declares the adapter
export function pick(x: number, flag: boolean): number {
  return flag ? x : 0;
}

// its caller passes the arguments in the new order: proved through the summary of pick under its adapter
export function usePick(n: number): number {
  return pick(n, n > 0) + 1;
}

// its parameter widens to admit null; the candidate's comment declares the adapter
// lean-adapter {"from": ["x"], "to": ["x"], "map": ["Some(x)"]}
export function pad(x: number | null): number {
  if (x === null) return 0;
  return x + 1;
}

// its two parameters swap places and no adapter is declared: an interface change, never a proof
export function shift(on: boolean, a: number): number {
  return on ? a + 1 : a;
}

// untouched
export function twice(x: number): number {
  return x * 2;
}
