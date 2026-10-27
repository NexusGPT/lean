// Stage 5 rank 21: a local procedure (a const arrow with a block body, or a nested function) whose name is used only as
// the callee of plain call statements is read as its body spliced at each call, the parameters bound to the arguments;
// an outer local, array or record it writes threads like any statement of the unit.

// a refactor: the procedure's body written inline in the loop (the same statements)
export function countWords(lines: string[]): number {
  let total = 0;
  for (const line of lines) { const s = line; total = total + s.split(" ").length; }
  return total;
}

// changed behaviour: zero kept too: a WITNESS on an array holding 0
export function gather(xs: number[]): number[] {
  const out: number[] = [];
  function keep(x: number): void { if (x >= 0) out.push(x); }
  for (const x of xs) keep(x);
  return out;
}

// changed behaviour: the first call dropped: a WITNESS on any input
export function tagged(xs: number[]): number {
  const acc = { n: 0, sum: 0 };
  const note = (v: number): void => { acc.n = acc.n + 1; acc.sum = acc.sum + v; };
  for (const x of xs) note(x);
  return acc.sum * 100 + acc.n;
}

// untouched: a procedure called with a literal
export function bump(start: number): number {
  let n = start;
  const inc = (by: number): void => { n = n + by; };
  inc(1);
  inc(2);
  return n;
}
