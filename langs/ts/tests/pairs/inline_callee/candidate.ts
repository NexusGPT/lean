// The heap core when a refactor inlines a same-file callee: the callee is gone from the candidate, its caller stays.
type User = { name: string; visits: number };

// the helper's write inlined: the same write, the same read after it
export function rename(user: User, name: string): number {
  user.name = name;
  return user.visits;
}

// the helper inlined with a changed step: two visits counted instead of one
export function visit(user: User): number {
  user.visits = user.visits + 2;
  return user.visits;
}

// reads only
export function nameOf(user: User): string {
  return user.name;
}

// the helper method inlined: the same field reads and write, in the same order
/** @sealed */
export class Counter {
  count = 0;
  step = 1;
  tick(): number {
    this.count = this.count + this.step;
    return this.count;
  }
}
