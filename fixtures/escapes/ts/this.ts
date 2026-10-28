// expect: this
// this in a free function that declares no receiver
export function self(): number {
  return this === undefined ? 0 : 1;
}
