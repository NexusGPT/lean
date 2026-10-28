// expect: prototype migration
export function change(target: object, parent: object): object {
  Object.setPrototypeOf(target, parent);
  return target;
}
