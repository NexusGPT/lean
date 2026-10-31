export function Entity(): ClassDecorator { return () => undefined; }
export function Track(): MethodDecorator { return () => undefined; }
// a property decorator receives the prototype and may install an accessor there: each read of the field counts
export function Column(): PropertyDecorator {
  return (target, key) => {
    const store = new WeakMap<object, string>();
    let reads = 0;
    Object.defineProperty(target, key, {
      get(this: object): string { reads += 1; return (store.get(this) ?? "") + String(reads); },
      set(this: object, v: string) { store.set(this, v); },
      configurable: true,
    });
  };
}
// a method or accessor decorator may return another descriptor: each call of the method, or read of the getter, counts
export function Count(): MethodDecorator {
  return ((_target: object, _key: string | symbol, desc: PropertyDescriptor): PropertyDescriptor => {
    let calls = 0;
    const get = desc.get;
    if (get) return { ...desc, get(this: unknown): number { calls += 1; return (get.call(this) as number) + calls; } };
    const f = desc.value as (...a: unknown[]) => number;
    return { ...desc, value(this: unknown, ...a: unknown[]): number { calls += 1; return f.apply(this, a) + calls; } };
  }) as MethodDecorator;
}
