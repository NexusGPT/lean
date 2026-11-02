// a Flow file under a .ts name: TypeScript's error recovery reads the bounded type parameter as something else
export function encode<A: Iterable<any>, T>(value: A, options?: {signal?: T}): Promise<string> {
  return Promise.resolve(String(value));
}
