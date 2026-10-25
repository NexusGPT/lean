// expect: dynamic-eval
export function run(code: string): number {
  return eval(code);
}
