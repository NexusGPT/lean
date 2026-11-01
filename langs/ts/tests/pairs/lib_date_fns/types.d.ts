// the date-fns declarations the pair reads (date-fns 3's own types, narrowed)
declare module 'date-fns' {
  export function addHours(d: Date | number, n: number): Date;
  export function differenceInMinutes(a: Date | number, b: Date | number): number;
  export function differenceInHours(a: Date | number, b: Date | number): number;
}
