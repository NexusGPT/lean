// another parameter's default names the copied parameter: in the rewrite the default would read the outer name
export function shifted(v: number, xs: number[]): number[] {
  const step = (v: number, w: number = v): number => {
    v = v + 1;
    return v + w;
  };
  return xs.map((x) => step(x));
}
