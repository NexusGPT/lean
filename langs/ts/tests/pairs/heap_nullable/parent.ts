// The heap core never reads an absent reference as present: `R | undefined` and a field `R | null` keep a unit out of
// the core (lane heap-reach's probe: the stripped union proved these two equal at the base).
type R = { ok: boolean };
type Holder = { next: R | null };

export function f(a: R | undefined): boolean {
  return a?.ok === true;
}

export function g(h: Holder): boolean {
  const n = h.next;
  if (n === null) {
    return false;
  }
  return n.ok;
}
