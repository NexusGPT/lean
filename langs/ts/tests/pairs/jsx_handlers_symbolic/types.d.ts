declare module "react" {
  export function useMemo<T>(fn: () => T, deps: readonly unknown[]): T;
  export function useCallback<T extends (...args: any[]) => any>(fn: T, deps: readonly unknown[]): T;
  export function useEffect(fn: () => void, deps: readonly unknown[]): void;
  export function useState<T>(initial: T): [T, (next: T | ((prev: T) => T)) => void];
}
declare module "service" {
  export function save(id: number): void;
  export function log(): void;
}
declare module "react/jsx-runtime" {
  export namespace JSX {
    interface Element { readonly jsx: true }
    interface IntrinsicElements { input: { value?: string; onChange?: (e: { target: { value: string } }) => void; [attr: string]: unknown }; [tag: string]: any } // a text input's value is a string
  }
}
