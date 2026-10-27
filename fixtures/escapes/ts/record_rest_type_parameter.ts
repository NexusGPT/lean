// expect: record-rest
export function withoutId<T extends { id: string; tags: string[] }>({ id, ...rest }: T): string { return id; }
