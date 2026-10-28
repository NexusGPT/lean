// expect: string-order
// comparing a string with a number or string union orders by coercion
export function before(a: string, b: string | number): boolean {
  return a < b;
}
