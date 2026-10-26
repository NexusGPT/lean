class Nominal { private brand = 0; }
export function test(x: Nominal): boolean { return x instanceof Nominal; }
export function invoke(x: object): boolean { return test(x as Nominal); }
export function make(x: object) { return x as Nominal; }
export function resultTest(x: object): boolean { return make(x) instanceof Nominal; }
export function assignedBox(x: unknown): boolean { const box: { values: number[] } = { values: [] }; box.values = x as number[]; return Array.isArray(box.values); }
export function pushed(x: unknown): boolean { const values: number[][] = []; values.push(x as number[]); return Array.isArray(values[0]); }
export function dictionaryKey(x: unknown, o: Record<string, number>): boolean { return (x as string) in o; }
export function nonNull(x: Nominal | undefined): boolean { if (x === undefined) return false; return x! instanceof Nominal; }
export function destructured({ value }: { value: number[] }): boolean { return Array.isArray(value); }
export function callDestructured(x: unknown): boolean { return destructured(x as { value: number[] }); }
