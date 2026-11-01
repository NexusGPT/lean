// The opacity ladder (design/w1c-opaque-calls.md), rule `unsupported-syntax`: `import.meta.env`, injected at build time. The statement holding it is one opaque
// step keyed by its text, reading every name it mentions, writing every name it assigns and every object in scope.

export function outside_syntax(x: number): number {
  const y = x + 1;
  const z = (import.meta as any).env.LIMIT === "1" ? 1 : 0;
  return z + y;
}

export function inside_syntax(x: number): number {
  const y = x + 1;
  const z = (import.meta as any).env.MAX === "1" ? 1 : 0;
  return y + z;
}

export function read_syntax(x: number): number {
  const y = x + 2;
  const z = (import.meta as any).env.LIMIT === "1" ? y : 0;
  return z;
}

export function planted_syntax(x: number): number {
  const z = (import.meta as any).env.LIMIT === "1x" ? x : 0;
  return z;
}
