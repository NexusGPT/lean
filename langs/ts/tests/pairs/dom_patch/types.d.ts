declare module "react" {
  export function useEffect(fn: () => void, deps: readonly unknown[]): void;
}
declare module "service" {
  export function log(message: string): void;
}
declare module "react/jsx-runtime" {
  export namespace JSX {
    interface Element { readonly jsx: true }
    interface IntrinsicElements { [tag: string]: any }
  }
}
