declare const process: { env: Record<string, string | undefined> };
declare const require: (spec: string) => any;
let counter = 0;
const cache = new Map<string, number>([["hit", 7]]);
const offset = 2;

export function bump(): number {
  return counter;
}
export function twice(): number {
  bump();
  return bump();
}
export function cached(key: "hit" | "miss"): number {
  const snapshot = cache;
  const value = snapshot.get(key);
  if (value != null) return value;
  return 0;
}
export async function handler(x: number): Promise<number> {
  const mod = await import("./handler");
  return mod.other(x);
}
export function environment(): string | undefined {
  return process.env.OTHER_MODE;
}
export function syncHandler(x: number): number {
  const mod = require("./handler");
  return mod.handle(x);
}
export function dynamicRequire(spec: string): any {
  return require(spec);
}
export function store(key: string, value: number): number {
  cache.set(key, value);
  return cache.get(key) ?? 0;
}
export function untouched(x: number): number { return x + offset; }

export function aliasAcrossWrite(key: string, value: number): number {
  const snapshot = cache;
  return snapshot.get(key) ?? 0;
}
export function globalRead(): number {
  return globalThis.Math.E;
}
export function computedEnvironment(key: string): string | undefined {
  return process.env[key];
}

let initialValue = 12;
export function readInitial(): number { return initialValue; }
export function optionalGlobal(): number | undefined {
  const g = globalThis as { config?: { port: number } };
  return (g.config ?? { port: 0 }).port;
}

export function defaultCounter(value: number = counter): number { return value; }
export function conditionalEnvironment(value?: string): string | undefined {
  const outside = process.env.MODULE_MODE;
  return value ?? outside;
}
