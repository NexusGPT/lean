// the luxon declarations the pair reads (@types/luxon 3, narrowed)
declare module 'luxon' {
  export class DateTime { static fromMillis(t: number): DateTime; plus(d: { minutes?: number }): DateTime; toMillis(): number; }
}
