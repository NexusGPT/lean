// The one Z3 lean runs: the doubles reading (solve/fp.mjs) spawns it, check.mjs hands it to Dafny (`--solver-path`) and
// records it in the certificate's `tools`, the suite's step cache keys Dafny's results by it. One lookup, in order:
//   1. LEAN_Z3, a path to a Z3 executable (set but not answering --version: no Z3, never a silent fallback);
//   2. the Z3 bundled in a `z3/bin` folder beside the dafny executable on PATH (the first, by name, that answers);
//   3. the first `z3` on PATH that answers.
//   z3Binary() -> { path, version, source }   path null when none answered, `source` then says why
// `version` is the whole text `path --version` prints, trimmed (one line for every Z3 measured).
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const versionOf = (bin) => { const r = spawnSync(bin, ['--version'], { encoding: 'utf8', timeout: 20000 }); return r.status === 0 ? ((r.stdout ?? '') + (r.stderr ?? '')).trim() : null; };
const found = new Map(); // per LEAN_Z3 and PATH, so a test that sets either in-process sees its own answer
export function z3Binary() {
  const key = `${process.env.LEAN_Z3 ?? ''}\0${process.env.PATH ?? ''}`;
  if (found.has(key)) return found.get(key);
  const pick = () => {
    const pinned = process.env.LEAN_Z3;
    if (pinned) { const v = versionOf(pinned); return v ? { path: pinned, version: v, source: 'LEAN_Z3' } : { path: null, version: null, source: `LEAN_Z3 (${pinned}) did not answer --version` }; }
    for (const d of (process.env.PATH ?? '').split(path.delimiter).filter(Boolean)) {
      const exe = path.join(d, 'dafny');
      if (!fs.existsSync(exe)) continue;
      const bin = path.join(path.dirname(fs.realpathSync(exe)), 'z3', 'bin');
      const files = fs.existsSync(bin) ? fs.readdirSync(bin).filter((f) => /^z3/.test(f)).sort() : [];
      for (const f of files) { const v = versionOf(path.join(bin, f)); if (v) return { path: path.join(bin, f), version: v, source: 'bundled beside dafny' }; }
      break;
    }
    for (const d of (process.env.PATH ?? '').split(path.delimiter).filter(Boolean)) {
      const exe = path.join(d, 'z3');
      if (!fs.existsSync(exe)) continue;
      const v = versionOf(exe);
      if (v) return { path: exe, version: v, source: 'z3 on PATH' };
    }
    return { path: null, version: null, source: 'no z3 beside the dafny executable and none on PATH answered --version' };
  };
  const z = pick(); found.set(key, z); return z;
}
// the arguments that make Dafny verify with that Z3 (none when no Z3 answered: Dafny then reports its own failure)
export const dafnySolverArgs = () => { const z = z3Binary(); return z.path ? ['--solver-path', z.path] : []; };
