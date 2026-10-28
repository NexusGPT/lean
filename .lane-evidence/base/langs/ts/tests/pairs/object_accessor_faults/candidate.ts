export class Fault {
  get value(): number { throw "getter"; }
  set value(v: number) { throw "setter"; }
  read(): number { const n = this.value; return 2; }
  write(v: number): number { this.value = v; return 2; }
  caught(): number { try { return this.value; } catch { return 4; } }
}
export class ChangedFault {
  get value(): number { throw "after"; }
  read(): number { return this.value + 3; }
}
export function untouched(n: number): number { return n + 1; }
type Deep = { kind: "left"; payload: { level9: { level8: { level7: { level6: { level5: { level4: { level3: { level2: { level1: { level0: number } } } } } } } } } } } | { kind: "right"; payload: { level9: { level8: { level7: { level6: { level5: { level4: { level3: { level2: { level1: { level0: number } } } } } } } } } } };
export function opaqueTagged(x: Deep): number { return x.kind === "left" ? 2 : 0; }
export function nestedTag(x: { data: { kind: "left"; value: number } | { kind: "right"; other: number } }): number { if (x.data.kind === "left") return x.data.value + 0; return 0; }

export class SpecialGetter {
  get value(): number { return 0; }
  read(): boolean { return this.value === this.value; }
}
export class SpecialSetter {
  raw: number = 0;
  set value(v: number) { this.raw = Number.POSITIVE_INFINITY; }
  write(): boolean { this.value = 1; return this.raw === this.raw; }
}

export class AccessorStream {
  raw: number = 0;
  get total(): number { return this.raw; }
  set total(v: number) { this.raw = v + 2; }
  async *values(): AsyncGenerator<number> { this.total = 1; yield this.total; }
}
export async function streamAccessor(): Promise<number> {
  const stream = new AccessorStream();
  let total = 0;
  for await (const n of stream.values()) { total += n; }
  return total;
}

export class PromiseAccessor {
  n: number = 1;
  get total(): number { return this.n + 2; }
  async exact(svc: { get(): Promise<number> }): Promise<number> { return svc.get().then(() => this.total); }
  async stored(svc: { get(): Promise<number> }): Promise<number> {
    const pending = svc.get().then(() => this.total);
    return await pending;
  }
}
