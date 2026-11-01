// the dayjs declarations the pair reads (dayjs 1's own types, narrowed)
declare module 'dayjs' {
  interface Dayjs { add(n: number, unit: 'hour' | 'minute' | 'day'): Dayjs; valueOf(): number; }
  function dayjs(t: number): Dayjs;
  export default dayjs;
}
