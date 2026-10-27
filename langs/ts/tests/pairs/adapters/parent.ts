// A changed signature proves only through an adapter the developer declares: the theorem then compares the candidate
// on the adapted inputs with the parent on the original ones, f_candidate(A(x)) == f_parent(x).

// its two parameters swap places; the scope file declares the adapter
export function pick(flag: boolean, x: number): number {
  return flag ? x : 0;
}

// its caller passes the arguments in the new order: proved through the summary of pick under its adapter
export function usePick(n: number): number {
  return pick(n > 0, n) + 1;
}

// its parameter widens to admit null; the candidate's comment declares the adapter
export function pad(x: number): number {
  return x + 1;
}

// its two parameters swap places and no adapter is declared: an interface change, never a proof
export function shift(a: number, on: boolean): number {
  return on ? a + 1 : a;
}

// untouched
export function twice(x: number): number {
  return x * 2;
}
