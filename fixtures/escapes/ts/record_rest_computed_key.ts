// expect: record-rest
const KEY = "id";
type Row = { id: string; name: string; tags: string[] };
export function withoutKey({ [KEY]: k, ...rest }: Row): string { return rest.name + k; }
