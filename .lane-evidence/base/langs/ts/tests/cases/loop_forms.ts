export function nestedExits(xs: readonly number[], mode: number): number {
  let total = 0;
  outer: for (let i = 0; i < xs.length; i++) {
    for (const x of xs) {
      for (const y of xs) {
        total += 1;
        if (mode === 0) break outer;
        if (mode === 1) continue outer;
        if (mode === 2) return total;
        if (x === y) break;
      }
      total += 10;
    }
    total += 100;
  }
  return total;
}
export function switchControl(xs: readonly number[], mode: number): number {
  let total = 0;
  outer: for (const x of xs) {
    switch (mode) {
      case 0:
        if (x < 0) break;
        total += 1;
      default:
        total += 10;
      case 2:
        if (x < 0) continue outer;
        for (const y of xs) { if (y < 0) break; total += 1; }
        switch (x) { case 0: total += 2; break; default: total += 3; }
        break;
    }
    total += 100;
  }
  return total;
}
export function finiteWhile(start: number, xs: readonly number[]): number {
  let i = start;
  let total = 0;
  while (i < xs.length) { total += 1; i += 2; }
  return total;
}
export function downwardWhile(start: number): number {
  let i = start;
  let total = 0;
  while (i >= 0) { if (i === 2) break; total += 1; i -= 2; }
  return total;
}
export function labelledDo(n: number): number {
  let i = n;
  let total = 0;
  outer:
  // @decreases i
  do {
    for (let j = 0; j < 2; j++) {
      total += 1;
      if (i <= 0) break outer;
    }
    i -= 1;
    if (i === 1) continue outer;
    total += 10;
  } while (i > 0);
  return total;
}
export function labelledWhile(n: number, xs: readonly number[]): number {
  let i = n;
  let total = 0;
  outer:
  // @decreases i
  while (i > 0) {
    for (const x of xs) { if (x < 0) break outer; total += 1; }
    i--;
  }
  return total;
}
