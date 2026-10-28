// expect: dynamic-eval migration
export function evaluate(source: string): unknown {
  return eval(source);
}
export function construct(source: string): unknown {
  return new Function(source);
}
export function compile(source: string): unknown {
  return Function(source);
}
