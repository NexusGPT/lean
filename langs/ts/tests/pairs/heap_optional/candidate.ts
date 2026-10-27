// The heap core, stage 4: a field or parameter that may be undefined. A stored optional field keeps whether its key
// is missing or holds undefined; a value read from it is present or absent.
export type User = { name: string; nick?: string; visits: number | undefined };

// the presence test written out: the nickname read after the test
export function display(u: User): string {
  if (u.nick !== undefined) {
    return u.nick;
  }
  return u.name;
}

// a greeting with another default
export function greeting(u: User): string {
  return "hi " + (u.nick ?? "guest");
}

// the absent amount handled first
export function pad(n: number, by?: number): number {
  if (by === undefined) {
    return n;
  }
  return n + by;
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
