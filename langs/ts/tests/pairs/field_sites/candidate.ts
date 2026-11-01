export interface Store { put(key: string, value: number): void }

export class Counter {
  count = 0;
  constructor(private store: Store) {}
  save(n: number): void {
    this.count = n + 2;
    this.store.put('total', n);
  }
}
