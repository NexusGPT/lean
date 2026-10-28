/// <reference path="../clock_read/types.d.ts" />
export function integral(): boolean { const n = performance.now(); return n === Math.floor(n); }
export function aliasIntegral(): boolean { const now = performance.now; const n = now(); return n === Math.floor(n); }
export function tupleIntegral(): boolean { const n = process.hrtime()[1]; return n === Math.floor(n); }
export function same(): number { return performance.now(); }
export function fixed(n: number): Date { const date = new Date(n); return date; }
