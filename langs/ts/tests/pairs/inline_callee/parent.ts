// The heap core when a refactor inlines a same-file callee: the callee is gone from the candidate, its caller stays.
type User = { name: string; visits: number };

// writes the name through a helper
export function rename(user: User, name: string): number {
  setName(user, name);
  return user.visits;
}

function setName(user: User, name: string): void {
  user.name = name;
}

// counts a visit through a helper
export function visit(user: User): number {
  bump(user);
  return user.visits;
}

function bump(user: User): void {
  user.visits = user.visits + 1;
}

// reads only
export function nameOf(user: User): string {
  return user.name;
}

// a method that advances through a helper method on the same instance
export class Counter {
  count = 0;
  step = 1;
  tick(): number {
    this.advance();
    return this.count;
  }
  advance(): void {
    this.count = this.count + this.step;
  }
}
