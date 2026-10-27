// The heap core, stage 4: a field or parameter that may be undefined. A stored optional field keeps whether its key
// is missing or holds undefined; a value read from it is present or absent.
export type User = { name: string; nick?: string; visits: number | undefined };

// the name to show: the nickname when there is one
export function display(u: User): string {
  return u.nick ?? u.name;
}

// a greeting with a default
export function greeting(u: User): string {
  return "hi " + (u.nick ?? "friend");
}

// pads by an amount that may be left out
export function pad(n: number, by?: number): number {
  return n + (by ?? 0);
}

// forgets the nickname
export function forget(u: User): number {
  u.nick = undefined;
  return 1;
}

// counts a visit
export function visit(u: User): number {
  const v = u.visits ?? 0;
  u.visits = v + 1;
  return v + 1;
}
