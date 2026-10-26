/// <reference path="./types.d.ts" />
import { save } from "./port";
export function once(n: number): number { const now = Date.now(); return now + n; }
export function dateOnce(n: number): number { const now = new Date(); return now.getTime() + n; }
export function windowSize(): number { const now = Date.now(); return now - now; }
export function dateWindow(): number { const now = new Date(); return now.getTime() - now.getTime(); }
export function acrossPort(n: number): number { const now = Date.now(); save(n); return now; }
export function fixed(n: number): Date { const value = new Date(n); return value; }
export function performanceOnce(): number { const now = performance.now(); return now; }
export function performanceWindow(): number { const now = performance.now(); return now - now; }
export function highResolution(): boolean { const time = process.hrtime(); return Array.isArray(time); }
export function highResolutionWindow(): boolean { const start = process.hrtime(); return start[0] === start[0] && start[1] === start[1]; }
export function untouched(): number { return Date.now(); }
export function numericOpaque(n: number): number { return Date.now() / n; }
