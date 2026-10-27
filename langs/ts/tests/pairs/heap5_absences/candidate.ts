// two corrections of the heap core: `===` between a value that may be null and one that may be undefined stays out
// (one Option would hold both absences, and null !== undefined), and an order of strings reads their code units
export function crossNull(a: number | null, b: number | undefined): boolean {
  return (a ?? 0) === (b ?? 0);
}

export function later(a: string, b: string): string {
  return b > a ? b : a;
}

export function before(a: string, b: string): boolean {
  return a <= b;
}
