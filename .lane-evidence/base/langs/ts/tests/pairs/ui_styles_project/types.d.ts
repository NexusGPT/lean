declare module "react/jsx-runtime" {
  export namespace JSX {
    interface Element { readonly jsx: true }
    interface IntrinsicElements { [tag: string]: any }
  }
}
