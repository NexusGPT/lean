// Minimal web-platform fakes (fixture until w2c's exec/fakes/web/*.mjs land): the real classes and structuredClone, each
// construction and call recorded.
import { recorded } from './_recorded.mjs';

export const specifier = ['global:Headers', 'global:TextEncoder', 'global:TextDecoder', 'global:structuredClone', 'global:AbortController'];
export function create(env) {
  return recorded(env, 'global', globalThis, ['Headers', 'TextEncoder', 'TextDecoder', 'structuredClone', 'AbortController']);
}
