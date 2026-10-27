// expect: bare-return
// a bare return yields undefined; a declared result that has no undefined member stays refused
export function code(s: string): string { if (s.length === 0) return; return s; }
