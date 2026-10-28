// expect: object-method-capture
export function changed(): number { let count = 0; const obj = { read(): number { return count; } }; count++; return obj.read(); }
export function recordCapture() { const data = { n: 0 }; const obj = { read() { return data.n; } }; data.n++; return obj.read(); }
