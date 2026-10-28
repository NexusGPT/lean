// Stage 5 rank 21: local procedures spliced at their calls, run in Node and in Dafny on the same inputs (the differential
// step): every write the body makes must reach the cell after the call, and a parameter bound per call.
export function countWords(lines: string[]): number {
  let total = 0;
  const add = (s: string): void => { total = total + s.split(" ").length; };
  for (const line of lines) add(line);
  return total;
}
export function gather(xs: number[]): number[] {
  const out: number[] = [];
  function keep(x: number): void { if (x > 0) out.push(x); }
  for (const x of xs) keep(x);
  return out;
}
export function tagged(xs: number[]): number {
  const acc = { n: 0, sum: 0 };
  const note = (v: number): void => { acc.n = acc.n + 1; acc.sum = acc.sum + v; };
  note(xs.length);
  for (const x of xs) note(x);
  return acc.sum * 100 + acc.n;
}
