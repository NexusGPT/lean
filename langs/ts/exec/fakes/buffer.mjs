// `buffer`: Node's own Buffer (the sandbox's global Buffer is the same class), so a byte length, an encoding or a slice
// is what Node computes.
import nodeBuffer from 'node:buffer';
import { entries } from './common.mjs';

export function bufferModel() {
  const B = nodeBuffer.Buffer;
  const calls = { 'Buffer.from': (a) => B.from(...a), 'Buffer.alloc': (a) => B.alloc(...a), 'Buffer.byteLength': (a) => B.byteLength(...a), 'Buffer.concat': (a) => B.concat(...a), 'Buffer.isBuffer': (a) => B.isBuffer(a[0]), 'Buffer.compare': (a) => B.compare(...a), 'Buffer.isEncoding': (a) => B.isEncoding(a[0]), atob: (a) => nodeBuffer.atob(a[0]), btoa: (a) => nodeBuffer.btoa(a[0]) };
  return entries({ name: 'buffer', calls, pure: Object.keys(calls), values: { Buffer: () => B, constants: () => nodeBuffer.constants, kMaxLength: () => nodeBuffer.kMaxLength } });
}
