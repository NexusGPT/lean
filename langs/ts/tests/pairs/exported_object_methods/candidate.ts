export const ops = {
  base: 10,
  add(x: number): number { return x + 2; },
  scale(x: number): number { return x * 2; },
  shift(x: number): number { return this.base + x; },
  viaSibling(x: number): number { return this.add(x) * 3; },
  label: (s: string): string => s.trim(),
};
export function useOps(x: number): number { return ops.add(x) + 1; }
