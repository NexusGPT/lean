// expect: prototype
// a file that replaces a prototype can hand any unit an object whose `in` does not reach Object.prototype's names
export interface Holder { tag: string }
export function adopt(h: Holder, base: Holder): Holder { (h as any).__proto__ = base; return h; }
export function tagged(d: Record<string, number>): boolean { return 'toString' in d; }
