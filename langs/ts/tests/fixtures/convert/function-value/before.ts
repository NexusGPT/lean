// function-value: an arrow handed inline to a same-file function becomes a named local with the types the call gave it
function total(xs: number[], f: (x: number) => number): number {
  let t = 0;
  for (const x of xs) t += f(x);
  return t;
}

export function scaled(xs: number[], k: number): number {
  return total(xs, (x) => x * k);
}
