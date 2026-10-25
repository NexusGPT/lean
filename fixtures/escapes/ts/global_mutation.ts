// expect: global-mutation
let counter = 0;
export function next(): number {
  counter = counter + 1;
  return counter;
}
