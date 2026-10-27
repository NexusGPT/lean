// expect: alias-mutation
type Row = { id: string; tags: string[] };
export function tagRest({ id, ...rest }: Row): string { rest.tags.push(id); return id; }
