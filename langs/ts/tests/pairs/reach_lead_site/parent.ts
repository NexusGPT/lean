export interface Store { put(key: string, value: number): void }

export function settle(store: Store, a: number, b: number): number {
  let extra = 0;
  if (a === 7) {
    store.put("n", a + 1);
    if (b > 100) {
      extra = 1;
    }
  }
  return extra;
}
