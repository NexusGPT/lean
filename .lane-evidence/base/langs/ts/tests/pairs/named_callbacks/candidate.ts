import { lookup, known } from './base';

// a same-file function that makes a transition: passed by name, it reads the element only
export function toLabel(id: string): string {
  return `${lookup(id)}!`;
}
export function labels(ids: string[]): string {
  return ids.map((id) => toLabel(id)).join(',');
}
export function isKnown(id: string): boolean {
  return known(id) && id !== 'x';
}
export function knownCount(ids: string[]): number {
  return ids.filter((id) => isKnown(id)).length;
}
// an imported function passed by name: the callee takes the element, the index and the array
export function anyKnown(ids: string[]): boolean {
  return ids.some(known);
}
// Boolean passed by name reads the element as its direct call does
export function present(names: (string | undefined)[]): (string | undefined)[] {
  return names.filter(Boolean);
}
// a same-file function with an index parameter: passed by name, it receives the index JavaScript passes
export function tag(id: string, i: number): string {
  return `${i}:${lookup(id)}`;
}
export function tagged(ids: string[]): string {
  return ids.map((id) => tag(id, 0)).join(',');
}
