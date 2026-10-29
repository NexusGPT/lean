declare module "react" {
  export function useMemo<T>(fn: () => T, deps: readonly unknown[]): T;
  export function useCallback<T extends (...args: any[]) => any>(fn: T, deps: readonly unknown[]): T;
  export function useEffect(fn: () => void, deps: readonly unknown[]): void;
  export function useState<T>(initial: T): [T, (next: T | ((prev: T) => T)) => void];
  export function useRef<T>(initial: T): { current: T };
}
declare module "next/router" {
  export function useRouter(): { push(path: string): void; pathname: string };
}
declare module "service" {
  export function save(id: number): void;
}
declare module "react/jsx-runtime" {
  export namespace JSX {
    interface Element { readonly jsx: true }
    interface IntrinsicElements { [tag: string]: any }
  }
}
declare module "api" {
  export function makeApi(): { push(n: number): void };
}
