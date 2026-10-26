// expect: type-test-cast
class Nominal { private brand = 0; }
export function forged(x: object): boolean { return (x as Nominal) instanceof Nominal; }
