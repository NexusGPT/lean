// expect: record-rest
interface Lazy { get size(): number; label: string; items: string[] }
export function withoutLabel({ label, ...rest }: Lazy): number { return rest.items.length + label.length; }
