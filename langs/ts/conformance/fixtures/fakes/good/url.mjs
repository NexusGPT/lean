// A minimal url fake (fixture until w2b's exec/fakes/url.mjs and w2c's exec/fakes/web/url.mjs land): the real classes
// and functions, every call and construction recorded.
import realUrl from 'node:url';
import { recorded } from './_recorded.mjs';

export const specifier = ['node:url', 'global:URL', 'global:URLSearchParams'];
export function create(env) {
  return recorded(env, 'module:url', realUrl, ['URL', 'URLSearchParams', 'fileURLToPath', 'pathToFileURL', 'format', 'parse']);
}
