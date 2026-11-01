// `path`: Node's own pure functions (node:path, POSIX), so a joined, parsed or normalised path is the value Node computes.
// The two functions that read the process's working directory (resolve, relative, and absolute-making in toNamespacedPath)
// read the fake world's instead: `/app` (process.mjs cwd), never the host's, so the answer is the same on every machine.
import nodePath from 'node:path';
import { entries, recordOf } from './common.mjs';

export const CWD = '/app';
const P = nodePath.posix;
export const resolveIn = (...parts) => P.resolve(CWD, ...parts.map(String));

export function pathModel(env) {
  const own = {
    join: (a) => P.join(...a), normalize: (a) => P.normalize(a[0]), basename: (a) => P.basename(...a), dirname: (a) => P.dirname(a[0]),
    extname: (a) => P.extname(a[0]), isAbsolute: (a) => P.isAbsolute(a[0]), format: (a) => P.format(a[0]),
    parse: (a) => recordOf(env, P.parse(a[0])), resolve: (a) => resolveIn(...a), relative: (a) => P.relative(resolveIn(a[0]), resolveIn(a[1])),
    toNamespacedPath: (a) => P.toNamespacedPath(a[0]), matchesGlob: (a) => P.matchesGlob(...a),
  };
  const calls = {}, values = { sep: () => P.sep, delimiter: () => P.delimiter };
  for (const [k, f] of Object.entries(own)) { calls[k] = f; calls[`posix.${k}`] = f; }
  values['posix.sep'] = values.sep; values['posix.delimiter'] = values.delimiter;
  return entries({ name: 'path', calls, pure: Object.keys(calls), values, objects: ['posix'] });
}
