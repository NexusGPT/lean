/// <reference path="./types.d.ts" />
import { save } from "./port";
export function once(n: number): number { const instant = Date.now(); return n + instant; }
export function dateOnce(n: number): number { const instant = new Date(); return n + instant.getTime(); }
export function windowSize(): number { const start = Date.now(); const end = Date.now(); return end - start; }
export function dateWindow(): number { const start = new Date(); const end = new Date(); return end.getTime() - start.getTime(); }
export function acrossPort(n: number): number { save(n); const now = Date.now(); return now; }
export function fixed(n: number): Date { return new Date(n); }
export function performanceOnce(): number { return performance.now(); }
export function performanceWindow(): number { const start = performance.now(); return performance.now() - start; }
export function highResolution(): boolean { const time = process.hrtime(); return Array.isArray(time); }
export function highResolutionWindow(): boolean { const start = process.hrtime(); const end = process.hrtime(); return start[0] === end[0] && start[1] === end[1]; }
export function untouched(): number { return Date.now(); }
export function numericOpaque(n: number): number { return Date.now() / n; }
