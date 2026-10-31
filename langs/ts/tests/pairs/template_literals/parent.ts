// template literals: a template is the concatenation of its parts, each hole by ToString; a tagged template is the
// call of its tag on the site's strings object (its cooked parts and its raw parts) and the holes
export interface Item { name: string; qty: number; done: boolean }

function caps(strs: TemplateStringsArray, ...vals: string[]): string {
  return String.raw(strs, ...vals) + "!";
}

function mark(strs: TemplateStringsArray, it: Item): string {
  it.qty = it.qty + 1;
  return strs[0] + it.name;
}

export function line(it: Item): string {
  return `${it.name} x${it.qty}`;
}

export function status(it: Item): string {
  return `${it.name}: ${it.done ? "done" : `left ${it.qty}`}`;
}

export function shade(it: Item): string {
  return `${it.name} is ${it.done ? "closed" : "open"}`;
}

export function path(s: string): string {
  return String.raw`C:\dir\file-${s}`;
}

export function ident(s: string): string {
  return String.raw`id\u0041${s}`;
}

export function tagged(s: string): string {
  return caps`a${s}b`;
}

export function escaped(s: string): string {
  return caps`a\u0041${s}`;
}

export function twice(it: Item): string {
  const a = mark`m${it}`;
  return a + mark`m${it}`;
}
