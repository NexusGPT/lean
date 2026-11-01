// `process` (the module and the sandbox's global, which is the same fake): `env` is a record from the recording, each
// variable drawn once by the seed and its name (absent, or one of the unit's own strings) and kept from then on, a
// write stored as Node stores it (as a string), a delete removing it; `argv` is `node`, the script and up to two drawn
// arguments; `cwd()` is `/app` (the fake file tree's working directory); `platform` is `linux`; `exit(code)` is a
// fault: the call is on the trace, and it throws ProcessExit with the code, so the rest of the unit does not run.
import { drawOf, drawnString, entries, listOf, worldError } from './common.mjs';
import { CWD } from './path.mjs';

export class ProcessExit extends Error { constructor(code) { super(`process.exit(${code === undefined ? '' : code})`); this.name = 'ProcessExit'; this.code = code; } }

export function processModel(env) {
  const vars = new Map(); // name -> string | undefined (absent)
  const read = (k) => { if (!vars.has(k)) vars.set(k, drawOf(env, `env:${k}`) < 0.4 ? undefined : drawnString(env, `env:${k}`)); return vars.get(k); };
  let argv = null;
  const argvOf = () => { if (!argv) { const n = Math.floor(drawOf(env, 'argv') * 3); argv = ['/usr/local/bin/node', `${CWD}/main.js`, ...Array.from({ length: n }, (_, i) => drawnString(env, `argv:${i}`))]; } return listOf(env, argv); };
  let dir = CWD;
  const calls = {
    cwd: () => dir,
    chdir: ([d]) => { dir = String(d).startsWith('/') ? String(d) : `${dir}/${d}`; return undefined; },
    exit: ([code]) => { throw worldError(ProcessExit, code); },
    // the env record read as a whole: what the run has read or written and holds present
    'env.toJSON': () => Object.fromEntries([...vars].filter(([, v]) => v !== undefined)),
  };
  const values = { argv: argvOf, platform: () => 'linux', execPath: () => '/usr/local/bin/node' }; // exitCode is no model field: the unit's write stays a recorded write (pair process-write)
  return entries({
    name: 'process', calls, pure: ['cwd', 'chdir', 'exit', 'env.toJSON'], values, objects: ['env'],
    dynamic: (m) => {
      if (!m.startsWith('env.') || m.slice(4).includes('.')) return null;
      const k = m.slice(4);
      return { value: () => read(k), set: (v) => { vars.set(k, String(v)); }, has: () => read(k) !== undefined, delete: () => { vars.set(k, undefined); } };
    },
  });
}
