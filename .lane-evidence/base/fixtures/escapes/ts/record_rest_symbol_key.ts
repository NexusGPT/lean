// expect: record-rest
const tag: unique symbol = Symbol("tag");
type Tagged = { [tag]: string; name: string; items: string[] };
export function withoutName({ name, ...rest }: Tagged): number { return rest.items.length + name.length; }
