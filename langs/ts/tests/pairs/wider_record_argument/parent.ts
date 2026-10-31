// A same-file callee reads a reference parameter's cell through the constructors of the parameter's shape
export type Named = { name: string };
export type Person = { name: string; age: number };
export type Circle = { kind: 'c'; r: number };
export type Square = { kind: 's'; w: number };
export type Shape = Circle | Square;

function greet(p: Named): string {
  return p.name;
}

export function who(x: Person): string {
  return greet(x);
}

export function hi(n: Named): string {
  return greet(n);
}

function size(s: Shape): number {
  return s.kind === 'c' ? s.r : s.w;
}

export function circ(c: Circle): number {
  return size(c);
}
