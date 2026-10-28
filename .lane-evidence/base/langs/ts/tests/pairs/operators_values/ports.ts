export interface Cursor { next(): number | null; }
export interface Sink { put(a: number, b: number): number; }
