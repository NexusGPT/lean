export function labelledBreak(xs: readonly number[]): number {
  let total = 0;
  outer: for (const x of xs) {
    for (const y of xs) {
      total += 1;
      if (x === y) break outer;
    }
    total += 10;
  }
  return total;
}
export function fallThrough(kind: 0 | 1 | 2): number {
  let total = 0;
  switch (kind) {
    case 0: total += 1;
    default: total += 10;
    case 2: total += 100; break;
  }
  return total;
}
export function guardedWhile(xs: readonly number[]): number {
  let i = 0;
  let total = 0;
  while (true) {
    if (i >= xs.length) break;
    total += 1;
    i++;
  }
  return total;
}
export function derivedWhile(n: number): number {
  let i = 0;
  let total = n;
  while (i < 2) { total += i; i++; }
  return total;
}
export function emptyFor(xs: readonly number[]): number {
  let i = 0;
  for (;;) {
    if (i >= xs.length) break;
    i += 1;
  }
  return i;
}
export function labelledContinue(xs: readonly number[]): number {
  let total = 0;
  outer: for (let i = 0; i < xs.length; i++) {
    for (const x of xs) {
      if (x < 0) continue outer;
      total += 1;
    }
    total += 10;
  }
  return total;
}
export function untouched(n: number): number { return n + 7; }

export function opaqueBound(xs: readonly number[]): number {
  let i = 0;
  const step = 1;
  while (i < xs.length) { i += step; }
  return i;
}
interface Selector { pick(): number; key(n: number): number; emit(n: number): number; }
export function switchEffects(svc: Selector): number {
  switch (svc.pick()) {
    case svc.key(1): return svc.emit(1);
    default: return svc.emit(9);
    case svc.key(2): return svc.emit(2);
  }
}

export function labelledReturn(xs: readonly number[], svc: Selector): number {
  outer: for (const x of xs) {
    for (const y of xs) {
      svc.emit(y);
      if (x === y) return svc.emit(x);
      if (x < 0) break outer;
    }
  }
  return svc.emit(0);
}

export function closedReturn(xs: readonly number[]): number {
  let i = 0;
  for (;;) { i++; if (i >= xs.length) return i; }
}
export function opaqueEscape(xs: readonly number[]): number {
  let total = 0;
  outer: for (const x of xs) {
    while (true) {
      if (x < 0) break outer;
      total = x;
      break;
    }
    total += 1;
  }
  return total;
}

export function switchFault(kind: 0 | 1 | 2): number {
  try {
    let total = 0;
    switch (kind) {
      case 0: total += 1;
      case 1: throw "bad";
      default: total += 2;
    }
    return total;
  } catch { return 9; }
}

type Deep = { a: { b: { c: { d: { e: { f: { g: { h: { i: number } } } } } } } } };
type DeepUnion = { kind: "deep"; value: Deep } | { kind: "empty" };
export function deepBound(value: DeepUnion): number {
  let i = 0;
  while (i < 2) { i++; }
  return i;
}

interface Sink { emit(value: number): void; }
export function bareUndefined(xs: readonly number[], sink: Sink): undefined {
  outer: for (const x of xs) {
    for (const y of xs) {
      sink.emit(y);
      if (x === y) return;
      if (x < 0) break outer;
    }
  }
  return;
}
export function nullishReturn(xs: readonly number[], n: number | null | undefined): number | null | undefined {
  outer: for (const x of xs) {
    for (const y of xs) {
      if (x === y) return n;
      if (x < 0) break outer;
    }
  }
  return null;
}
let count = 0;
export function moduleLoop(xs: readonly number[]): number {
  outer: for (const x of xs) {
    for (const y of xs) {
      count += y;
      if (x === y) break outer;
    }
  }
  return count;
}

let cursor = 0;
export function moduleBound(): number {
  let total = 0;
  for (;;) {
    if (cursor >= 3) break;
    total++;
    cursor++;
  }
  return total;
}

export function switchUpdate(n: number): number {
  let i = n;
  let total = 0;
  switch (i++) {
    case 0: total += 1;
    default: total += 10;
    case 2: total += 100; break;
  }
  return total + i;
}
export function doUpdate(n: number): number {
  let i = 0;
  let total = n;
  // @decreases if i < 3 then 3 - i else 0
  do { total++; } while (i++ < 2);
  return total + i;
}
