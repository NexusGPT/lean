// A wrong path fake: join glues its parts with '/' and never normalises ('a' + '..' stays 'a/..'). The row must refuse it
// on the exact agreement with node:path.
import realPath from 'node:path';

export const specifier = 'node:path';
export const expectRefused = ['agree'];
export function create(env) {
  const out = { ...realPath };
  out.join = (...parts) => { env.record('call', 'module:path.join', parts); return parts.join('/'); };
  for (const k of ['normalize', 'basename', 'dirname', 'extname', 'isAbsolute', 'parse', 'format', 'relative', 'resolve', 'toNamespacedPath']) { const f = realPath[k]; out[k] = (...a) => { env.record('call', `module:path.${k}`, a); return f(...a); }; }
  return out;
}
