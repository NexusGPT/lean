// stage 5 step 2: an empty literal takes the shape of the place it is written to, and an arrow whose body is an
// expression returns that expression
export interface Team { name: string; tags: string[]; size: number }

export const title = (t: Team): string => t.name;

export function reset(t: Team): Team {
  return { name: t.name, tags: [], size: 0 };
}

export function clear(t: Team): number {
  t.tags = [];
  return t.size;
}

export function start(): string[] {
  const xs: string[] = [];
  return xs;
}

export const twice = (n: number): number => n + n;
