// expect: property-assign
export function replaceGlobal(x: number): void {
  globalThis.counter = x;
}
