export type Level = 'high' | 'low' | 'mid';
export type Id = string & { readonly __id: true };
export interface Task { level: Level; n: number }

export function levelOrder(a: Level, b: Level): boolean {
  return a < b;
}

export function dropped(x: Task, y: Task): boolean {
  return x.level < y.level;
}

export function strict(a: Level, b: Level): boolean {
  return a < b;
}

export function idOrder(a: Id, b: Id): boolean {
  return a < b;
}
