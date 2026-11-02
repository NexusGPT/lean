declare const __FLAG__: boolean;

export function gate(n: number): number {
  if (__FLAG__ && n >= 5) return 1;
  return 0;
}

export function same(n: number): number {
  return __FLAG__ ? n : 0;
}

export function typo(n: number): number {
  return n + missingName;
}

export function fixed(n: number): number {
  return n + 1;
}
