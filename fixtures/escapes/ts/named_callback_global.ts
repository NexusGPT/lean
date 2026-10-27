// expect: callback-form
// a global outside Boolean, String, Number, parseInt and parseFloat has no reading as a callback
export function encoded(xs: string[]): string[] {
  return xs.map(encodeURIComponent);
}
