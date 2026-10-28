// expect: toplevel-effect
let counter = Date.now();
export function initialCounter(): number { return counter; }
