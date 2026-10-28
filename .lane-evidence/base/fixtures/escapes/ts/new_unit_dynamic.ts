// expect: load
// candidate-unit: f
export async function f(): Promise<unknown> { return import("./absent-new-unit-lazy"); }
