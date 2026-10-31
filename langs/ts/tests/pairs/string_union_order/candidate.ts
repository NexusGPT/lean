export type Level = 'high' | 'low' | 'mid';
export type Id = string & { readonly __id: true };
export interface Task { level: Level; n: number }

export function levelOrder(a: Level, b: Level): boolean {
  return b > a;
}

export function dropped(x: Task, y: Task): boolean {
  const t: Task = { level: x.level, n: 0 };
  return y.level > t.level;
}

export function strict(a: Level, b: Level): boolean {
  return a <= b;
}

export function idOrder(a: Id, b: Id): boolean {
  return b > a;
}
