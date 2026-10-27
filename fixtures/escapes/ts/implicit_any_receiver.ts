// expect: implicit-this
// a free function reading a `this` it does not declare (TS2683): the receiver is an input the function does not
// name; declare it as a `this` parameter
export function labelOf(): string {
  return this.label;
}
