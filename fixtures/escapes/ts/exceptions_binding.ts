// expect: exception-binding
export function f(error: number): number { try { throw "bad"; } catch (error) { } return error; }
