// expect: any-type conditional
export function doubled(count: any): number {
  return count > 1 ? count * 2 : 0;
}
export function pair(): number { return doubled(3); }
