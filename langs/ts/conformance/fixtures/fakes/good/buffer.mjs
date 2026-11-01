// A minimal buffer fake (fixture until w2b's exec/fakes/buffer.mjs lands): the real Buffer, its statics recorded.
import { Buffer as RealBuffer } from 'node:buffer';
import { recorded } from './_recorded.mjs';

export const specifier = 'node:buffer';
export function create(env) {
  const statics = recorded(env, 'module:buffer.Buffer', RealBuffer, ['from', 'alloc', 'byteLength', 'concat', 'compare', 'isBuffer', 'isEncoding']);
  return { Buffer: statics };
}
