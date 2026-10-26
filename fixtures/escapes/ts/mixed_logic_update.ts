// expect: operator-value-context
export function guarded(on: boolean): number { let n = 0; return on ? n++ : 0; }
