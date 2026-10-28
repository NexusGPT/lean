// expect: global-mutation
declare let counter: number;
export function next(): number {
  counter = counter + 1;
  return counter;
}
