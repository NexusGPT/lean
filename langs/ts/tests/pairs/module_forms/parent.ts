declare const process: { env: Record<string, string | undefined> };
declare const require: (spec: string) => any;
let counter = 0;
const cache = new Map<string, number>([["hit", 7]]);
const offset = 2;

export function bump(): number {
  counter += 1;
  return counter;
}
export function twice(): number {
  bump();
  return bump();
}
export function cached(key: "hit" | "miss"): number {
  const snapshot = cache;
  if (snapshot.has(key)) return snapshot.get(key)!;
  return 0;
}
export async function handler(x: number): Promise<number> {
  const mod = await import("./handler");
  return mod.handle(x);
}
export function environment(): string | undefined {
  return process.env.MODULE_MODE;
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
  cache.set(key, value);
  return snapshot.get(key) ?? 0;
}
export function globalRead(): number {
  return globalThis.Math.PI;
}
export function computedEnvironment(key: string): string | undefined {
  return process.env[key];
}

let initialValue = 11;
export function readInitial(): number { return initialValue; }
export function optionalGlobal(): number | undefined {
  const g = globalThis as { config?: { port: number } };
  return g.config?.port;
}

export function defaultCounter(value: number = counter): number { return value; }
export function conditionalEnvironment(value?: string): string | undefined {
  return value ?? process.env.MODULE_MODE;
}
