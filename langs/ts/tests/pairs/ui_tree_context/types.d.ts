declare module "react" {
  export interface Context<T> { Provider: any; Consumer: any; displayName?: string }
  export function createContext<T>(defaultValue: T): Context<T>;
  export function useContext<T>(context: Context<T>): T;
  export function useState<T>(initial: T | (() => T)): [T, (next: T | ((prev: T) => T)) => void];
}
declare module "react/jsx-runtime" {
  export namespace JSX {
    interface Element { readonly jsx: true }
    interface IntrinsicElements { [tag: string]: any }
  }
}
