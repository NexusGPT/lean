// A minimal path fake (fixture until w2b's exec/fakes/path.mjs lands): the real pure functions, every call recorded.
import realPath from 'node:path';
import { recorded } from './_recorded.mjs';

export const specifier = 'node:path';
const MEMBERS = ['join', 'normalize', 'resolve', 'relative', 'basename', 'dirname', 'extname', 'isAbsolute', 'parse', 'format', 'toNamespacedPath', 'sep', 'delimiter'];
export function create(env) {
  const out = recorded(env, 'module:path', realPath, MEMBERS);
  out.posix = recorded(env, 'module:path.posix', realPath.posix, MEMBERS);
  out.win32 = recorded(env, 'module:path.win32', realPath.win32, MEMBERS);
  return out;
}
