/// <reference lib="es2023" />
// The refused library member rows (design/library-rows.md, "2026-10-28 library members"). Every unit here is outside the
// proof subset on purpose, each by the rule its escape fixture names; lane B still judges the pair: a changed use is a
// WITNESS and an untouched one a bounded pass, so a refusal never leaves the pair without a verdict.

export function pushApplyChanged(a: string[], b: string[]): number {
  a.push.apply(a, b.slice(1));
  return a.length;
}
export function pushApplySame(a: string[]): number {
  a.push.call(a, "x");
  return a.length;
}

export function toTextChanged(v: string | { name: string }): string {
  return v.toString() + "!";
}
export function toTextSame(v: string | { name: string }): string {
  return v.toString();
}

export function indexChanged(s: string): number[] {
  const out: number[] = [];
  const re = /a+/g;
  let m = re.exec(s);
  while (m !== null) {
    out.push(m.index + 1);
    m = re.exec(s);
  }
  return out;
}
export function indexSame(s: string): number[] {
  const out: number[] = [];
  const re = /a+/g;
  let m = re.exec(s);
  while (m !== null) {
    out.push(m.index);
    m = re.exec(s);
  }
  return out;
}

export function groupChanged(s: string): string | undefined {
  const m = /@(?<host>[a-z.]+)/.exec(s);
  return m?.groups?.host?.toUpperCase();
}
export function groupSame(s: string): string | undefined {
  const m = /@(?<host>[a-z.]+)/.exec(s);
  return m?.groups?.host;
}

export function unionChanged(v: string | string[], x: string): number {
  return v.indexOf(x) + 1;
}
export function unionSame(v: string | string[], x: string): number {
  return v.indexOf(x);
}

export function sortedChanged(xs: string[]): string[] {
  const c = [...xs];
  c.sort();
  return c.slice(1);
}
export function sortedSame(xs: string[]): string[] {
  const c = [...xs];
  c.sort();
  return c;
}

export function lastChanged(xs: string[] | undefined): string | undefined {
  const c = xs === undefined ? undefined : [...xs];
  return c?.shift();
}
export function lastSame(xs: string[] | undefined): string | undefined {
  const c = xs === undefined ? undefined : [...xs];
  return c?.pop();
}

export class Queue {
  items: string[] = [];
  takeChanged(): string | undefined {
    return this.items.pop();
  }
  takeSame(): string | undefined {
    return this.items.shift();
  }
}
