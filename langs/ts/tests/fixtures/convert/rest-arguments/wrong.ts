// a wrong after: the proof must refute it with a WITNESS
// rest-arguments: `arguments` becomes a rest parameter where the lint decides only its length and literal indices are
// read; a function whose `arguments` is handed on is listed
function count(...args: [a: number, b: number, ...more: any[]]): number {
  const [a, b] = args;
  return args.length + a + a;
}

export function counted(n: number): number {
  return count(n, 1);
}

function total(xs: IArguments): number { return xs.length; }
export function handed(a: number, b: number): number {
  return total(arguments) + a + b;
}
