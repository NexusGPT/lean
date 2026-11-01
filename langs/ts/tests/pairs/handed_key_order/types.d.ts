// the lodash declarations the pair reads (the shape of @types/lodash for this export, narrowed to the pair's types)
declare module 'lodash' {
  export function keys(o: object): string[];
}
declare module 'dep' {
  export function log(o: object): void;
}
