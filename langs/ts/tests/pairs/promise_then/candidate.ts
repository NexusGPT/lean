import { importedBump } from './base';
interface Service {
  get(id: number): Promise<{ value: number }>;
  put(value: number): Promise<number>;
  read(id: number, cb: (r: { value: number }) => void): void;
}
export async function changed(svc: Service, id: number): Promise<number> {
  return await svc.get(id).then(r => r.value + 2);
}
export async function refactor(svc: Service, id: number): Promise<number> {
  const r = await svc.get(id);
  return r.value + 1;
}
export async function effects(svc: Service, id: number): Promise<number> {
  const r = await svc.get(id);
  const saved = await svc.put(r.value);
  return saved + 1;
}
export async function bridge(svc: Service, id: number): Promise<number> {
  return await new Promise<number>(resolve => {
    svc.read(id, r => resolve(r.value + 2));
  });
}
export async function literal(id: number): Promise<number> {
  return await new Promise<number>((resolve, reject) => {
    if (id < 0) { reject(id); } else { resolve(id + 2); }
  });
}
export async function caught(id: number): Promise<number> {
  return await Promise.reject(id).catch(e => 4);
}
export async function finalised(svc: Service, id: number): Promise<number> {
  return svc.get(id).then(r => r.value).finally(async () => { await svc.put(id + 1); });
}
export function bump(n: number): number { return n + 1; }
export async function named(id: number): Promise<number> {
  const n = await Promise.resolve(id).then(bump).then(importedBump);
  return n + 1;
}
export async function held(svc: Service, id: number): Promise<number> {
  const p = svc.get(id);
  await svc.put(id);
  const r = await p;
  return r.value + 1;
}
export function untouched(id: number): number { return id + 1; }
export async function settleRefactor(n: number): Promise<number> {
  return await Promise.resolve(n + 1);
}
export async function finallyValue(n: number): Promise<number> {
  return Promise.resolve(n).finally(() => 2);
}
export async function finalReject(n: number): Promise<number> {
  return Promise.resolve(n).finally(() => Promise.reject(n + 2));
}
export async function thrown(n: number): Promise<number> {
  return Promise.resolve(n).then(x => { throw x + 2; }).catch(e => e as number);
}

export async function recovered(svc: Service, id: number): Promise<number> {
  return svc.get(id).then(r => r.value).catch(e => 18);
}
