// The opacity ladder (design/w1c-opaque-calls.md), rule `iterator-protocol`: a custom `Symbol.iterator` method in an object literal. The statement holding it is one opaque
// step keyed by its text, reading every name it mentions, writing every name it assigns and every object in scope.

export function outside_iter(n: number): number {
  const m = n + 1;
  const it = { [Symbol.iterator]() { let i = 0; return { next: () => ({ done: i >= m, value: i++ }) }; } };
  return typeof it === "object" ? m * 2 : 0;
}

export function inside_iter(n: number): number {
  const m = n + 1;
  const it = { [Symbol.iterator]() { let i = 0; return { next: () => ({ done: i >= m, value: i++ }) }; } };
  return typeof it === "object" ? m : 0;
}
