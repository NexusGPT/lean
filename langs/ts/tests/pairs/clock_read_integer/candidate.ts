/// <reference path="../clock_read/types.d.ts" />
export function integral(): boolean { const n = performance.now(); return true; }
export function aliasIntegral(): boolean { const now = performance.now; const n = now(); return true; }
export function tupleIntegral(): boolean { const n = process.hrtime()[1]; return true; }
export function same(): number { return performance.now(); }
export function fixed(n: number): Date { return new Date(n); }
