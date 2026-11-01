// A minimal fs/promises fake (fixture): the promise half of the fs fixture.
import { makeFs } from './fs.mjs';

export const specifier = 'node:fs/promises';
export const create = (env, recording) => makeFs(env, recording).promises;
