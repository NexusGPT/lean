// Stage 5 rank 21: a local procedure (a const arrow with a block body, or a nested function) whose name is used only as
// the callee of plain call statements is read as its body spliced at each call, the parameters bound to the arguments;
// an outer local, array or record it writes threads like any statement of the unit.

// a counter written by a local arrow called in a loop
export function countWords(lines: string[]): number {
  let total = 0;
  const add = (s: string): void => { total = total + s.split(" ").length; };
  for (const line of lines) add(line);
  return total;
}

// an array pushed by a nested function, its parameter sharing the loop variable's name
export function gather(xs: number[]): number[] {
  const out: number[] = [];
  function keep(x: number): void { if (x > 0) out.push(x); }
  for (const x of xs) keep(x);
  return out;
}

// a record written by a local arrow called twice, once outside the loop
export function tagged(xs: number[]): number {
  const acc = { n: 0, sum: 0 };
  const note = (v: number): void => { acc.n = acc.n + 1; acc.sum = acc.sum + v; };
  note(xs.length);
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
