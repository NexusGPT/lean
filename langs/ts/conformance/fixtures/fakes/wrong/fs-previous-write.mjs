// The deliberately wrong fs fake (red-first fixture): the good fixture's tree, but every read returns the write before
// the latest one, whatever file it went to. The row must refuse it on write-then-read.
import { makeFs } from '../good/fs.mjs';

export const specifier = 'node:fs';
export const expectRefused = ['write-then-read'];
export const create = (env, recording) => makeFs(env, recording, { previousWrite: true });
