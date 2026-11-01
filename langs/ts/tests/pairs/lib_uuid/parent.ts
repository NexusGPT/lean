import { v4 } from 'uuid';
// a version-4 UUID: 36 characters, the version digit at 14 (lane B: the vendored uuid on the seeded generator)
export function shaped(): number { const a = v4(); return a.length === 36 && a.charAt(14) === '4' ? 1 : 0; }
