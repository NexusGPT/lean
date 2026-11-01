// The opacity ladder (design/w1c-opaque-calls.md), rule `unsupported-operator`: an assignment operator with no reading (`**=`). The statement holding it is one opaque
// step keyed by its text, reading every name it mentions, writing every name it assigns and every object in scope.

export function outside_operator(x: number): number {
  let a = x + 1;
  a **= 2;
  return a + 2 * x;
}

export function inside_operator(x: number): number {
  let a = x + 1;
  a **= 3;
  return a + 1;
}

export function read_operator(x: number): number {
  let a = x + 2;
  a **= 2;
  return a;
}

export function write_operator(x: number): number {
  let a = x + 1;
  const b = a;
  a **= 2;
  return a;
}

export function planted_operator(x: number): number {
  let a = x;
  a **= 3;
  return a;
}
