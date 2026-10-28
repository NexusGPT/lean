export function free(label: string = "ready", ...items: string[]) { return [label, items]; }
export function explicitThis(this: { label: string }, ...items: string[]) { return [this.label, items]; }
export function ordinary(items: string[], optional?: string) { return [items, optional]; }
export function tuple(...items: [string, number]) { return items; }
export function nested(...items: string[][]) { return items; }
export function mutate(...items: { value: number }[]) {
  if (items.length) items[0].value++;
  items.push({ value: 9 });
  return items.length;
}
export class Direct {
  items: string[];
  constructor(label: string = "ready", ...items: string[]) { this.items = [label, ...items]; }
  static staticCall(label: string = "ready", ...items: string[]) { return [label, items]; }
  call(label: string = "ready", ...items: string[]) { return [label, items]; }
}
export function environment(label: string = "ready", ...items: string[]) {
  return typeof label === "string" && items.every(x => typeof x === "string");
}
export async function freeRace(label: string = "ready", ...items: string[]) {
  await Promise.resolve();
  return typeof label === "string" && items.every(x => typeof x === "string");
}
export class RestConstructor {
  valid: boolean;
  constructor(label: string = "ready", ...items: string[]) {
    this.valid = typeof label === "string" && items.every(x => typeof x === "string");
  }
  check() { return this.valid; }
  async race() { await Promise.resolve(); return this.valid; }
}
export class RestMethod {
  constructor() {}
  check(label: string = "ready", ...items: string[]) {
    return typeof label === "string" && items.every(x => typeof x === "string");
  }
  async race(label: string = "ready", ...items: string[]) {
    await Promise.resolve();
    return typeof label === "string" && items.every(x => typeof x === "string");
  }
}
export function anyRest(...items: any) { return [Array.isArray(items), items.length]; }
export function unknownRest(...items: unknown) { return [Array.isArray(items), items.length]; }
