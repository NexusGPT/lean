import { z } from 'zod';
// a string schema's parse answers its input itself: only the package's parse meets the input (lane B: the vendored zod)
export function echoes(s: string): number { const r = z.string().parse(s); return r === s ? 1 : 0; }
