// the lodash declarations the pair reads (the shapes of @types/lodash for these exports, narrowed to the pair's types)
declare module 'lodash' {
  export function sum(xs: number[]): number;
  export function uniq<T>(xs: T[]): T[];
  export function groupBy<T>(xs: T[], key: string): Record<string, T[]>;
  export function get<T, R>(o: T, path: string): R;
  export function debounce<A extends unknown[]>(f: (...a: A) => void, wait: number): (...a: A) => void;
}
