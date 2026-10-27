// expect: bound-function proved
function add(a: number, b: number): number { return a + b; }
export function plusOne(n: number): number { return add.bind(null, 1)(n); }
