// stage 5 step 2: an empty literal takes the shape of the place it is written to, and an arrow whose body is an
// expression returns that expression
export interface Team { name: string; tags: string[]; size: number }

export const title = (t: Team): string => {
  const n = t.name;
  return n;
};

export function reset(t: Team): Team {
  return { name: t.name, tags: [], size: 1 };
}

export function clear(t: Team): number {
  const empty: string[] = [];
  t.tags = empty;
  return t.size;
}

export function start(): string[] {
  return [];
}

export const twice = (n: number): number => n + n;
