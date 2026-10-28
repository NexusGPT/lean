// A method called through apply or call with its own base as `this` is the direct call (design/push-apply.md): the
// parent writes the apply/call forms, the candidate the direct calls.

export function appendAll(a: string[], b: string[]): string[] {
  a.push(...b);
  return a;
}

export function appendOne(a: string[], x: string): number {
  a.push(x);
  return a.length;
}

// the parameter is changed only through apply: dropping the call changes what the caller sees in `a`
export function dropped(a: string[], x: string): number {
  return x.length;
}

export function changed(a: string[], x: string): string[] {
  a.unshift(x);
  return a;
}

export function front(a: string[], b: string[]): string[] {
  a.unshift(...b);
  return a;
}

export function cut(a: string[], i: number, x: string): string[] {
  a.splice(i, 1, x);
  return a;
}

// an Array.prototype method borrowed onto an array is that array's own method
export function borrowed(c: string[], b: string[]): string[] {
  c.push(...b);
  return c;
}

export function field(o: { items: string[] }, b: string[]): { items: string[] } {
  o.items.push(...b);
  return o;
}

export function local(b: string[]): number {
  const a: string[] = ["x"];
  a.push(...b);
  return a.length;
}

export function count(a: string[]): number {
  return a.length;
}
