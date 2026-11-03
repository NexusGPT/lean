// The version range a project declares for a package, and whether a vendored version is in it (lane w9bb). A vendored
// library row (index.mjs) is the package's own code at one version; a project that declares another major (Checkmate
// declares `"zod": "^4.1.11"`, lean vendors zod 3.25.76) calls members that version does not have (`z.email()` is zod 4),
// and its module fails at its load: the fake answered for a package it is not. The range is npm's: `||` of comparator
// sets, each comparator `^`, `~`, `>=`, `>`, `<=`, `<`, `=` or bare, x-ranges (`4`, `4.x`, `*`) and hyphen ranges
// (`1.2 - 3`). `admits(range, version)` is true or false, or null for a range it cannot read (a tag, `workspace:`, a URL,
// a git or file spec): then nothing is known and the row stays as it was.
import fs from 'node:fs';
import path from 'node:path';

const DEP_KEYS = ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies'];
// the range the nearest package.json at or above `dir` that declares `pkg` gives it, else null
export function declaredRange(dir, pkg) {
  for (let d = dir ? path.resolve(dir) : null; d;) {
    const f = path.join(d, 'package.json');
    if (fs.existsSync(f)) {
      let j = null; try { j = JSON.parse(fs.readFileSync(f, 'utf8')); } catch { /* unreadable: keep walking */ }
      for (const k of DEP_KEYS) if (j && typeof j[k]?.[pkg] === 'string') return j[k][pkg];
    }
    const up = path.dirname(d); if (up === d) break; d = up;
  }
  return null;
}

const parse = (v) => { const m = /^v?(\d+|[xX*])(?:\.(\d+|[xX*]))?(?:\.(\d+|[xX*]))?(?:-([0-9A-Za-z.-]+))?(?:\+[0-9A-Za-z.-]+)?$/.exec(String(v).trim()); if (!m) return null; const n = (x) => (x === undefined || /^[xX*]$/.test(x) ? null : Number(x)); return { major: n(m[1]), minor: n(m[2]), patch: n(m[3]), pre: m[4] ?? null }; };
const cmp = (a, b) => (a.major - b.major) || (a.minor - b.minor) || (a.patch - b.patch) || (a.pre === b.pre ? 0 : a.pre === null ? 1 : b.pre === null ? -1 : a.pre < b.pre ? -1 : 1);
const fill = (p) => ({ major: p.major ?? 0, minor: p.minor ?? 0, patch: p.patch ?? 0, pre: p.pre });
// the [low, high) bounds of one comparator (high exclusive, null: none), or null when unreadable
function bounds(op, p) {
  const lo = fill(p), next = (k) => ({ major: k === 'major' ? (p.major ?? 0) + 1 : p.major, minor: k === 'major' ? 0 : k === 'minor' ? (p.minor ?? 0) + 1 : p.minor, patch: 0, pre: '0' }); // `-0`: below every release of that version
  const partial = p.major === null ? 'any' : p.minor === null ? 'major' : p.patch === null ? 'minor' : null;
  if (partial === 'any') return [null, null]; // `*`, `x`: every version
  switch (op) {
    case '^': return [lo, next(p.major > 0 || p.minor === null ? 'major' : p.minor > 0 || p.patch === null ? 'minor' : 'patch')];
    case '~': return [lo, next(partial === 'major' ? 'major' : 'minor')];
    case '': case '=': return partial ? [lo, next(partial)] : [null, null, lo]; // a full version is that version alone
    case '>=': return [lo, null];
    case '>': return partial ? [next(partial), null] : [{ ...lo, gt: true }, null];
    case '<': return [null, lo];
    case '<=': return [null, partial ? next(partial) : { ...lo, le: true }];
    default: return null;
  }
}
function inBounds(v, b) {
  const [lo, hi, exact] = b;
  if (exact) return cmp(v, exact) === 0;
  if (lo && (lo.gt ? cmp(v, lo) <= 0 : cmp(v, lo) < 0)) return false;
  if (hi && (hi.le ? cmp(v, hi) > 0 : cmp(v, hi) >= 0)) return false;
  return true;
}
// whether the vendored version may answer for the range (lane w9bb): the range admits it, or one of its sets starts on
// the vendored version's compatibility line (the same major, the same major.minor below 1.0.0), where semver keeps the
// API: an exact pin `dayjs@1.11.13` is answered by the vendored 1.11.23, `zod@^4.1.11` is not by 3.25.76. null: unread
export function compatible(range, version) {
  const a = admits(range, version); if (a !== false) return a;
  const v = parse(version);
  const line = (p) => p && p.major === v.major && (v.major > 0 || p.minor === v.minor);
  return lowerBounds(range).some(line);
}
function lowerBounds(range) {
  return String(range).split('||').flatMap((set) => {
    const s = set.trim().replace(/\s*-\s+/, ' - ');
    const hy = /^(\S+) - (\S+)$/.exec(s);
    const comps = hy ? [['>=', hy[1]]] : s.split(/\s+/).filter(Boolean).map((c) => { const m = /^(\^|~>?|>=|<=|>|<|=)?\s*(.+)$/.exec(c); return [m[1] ?? '', m[2]]; });
    return comps.filter(([op]) => !op.startsWith('<')).map(([, ver]) => parse(ver)).filter((p) => p && p.major !== null).map(fill);
  });
}
export function admits(range, version) {
  const v = parse(version); if (!v || v.major === null || v.minor === null || v.patch === null) return null;
  const text = String(range ?? '').trim();
  if (text === '' || text === '*' || text === 'x' || text === 'latest') return text === 'latest' ? null : true;
  let readable = true;
  const sets = text.split('||').map((set) => {
    const s = set.trim().replace(/\s*-\s+/, ' - ');
    const hy = /^(\S+) - (\S+)$/.exec(s);
    const comps = hy ? [['>=', hy[1]], ['<=', hy[2]]] : s.split(/\s+/).filter(Boolean).map((c) => { const m = /^(\^|~>?|>=|<=|>|<|=)?\s*(.+)$/.exec(c); return [m[1] === '~>' ? '~' : m[1] ?? '', m[2]]; });
    return comps.map(([op, ver]) => { const p = parse(ver); const b = p && bounds(op, p); if (!b) readable = false; return b; });
  });
  if (!readable) return null;
  // a prerelease version is admitted only by a set that names a prerelease of the same major.minor.patch (npm's rule)
  return sets.some((set) => set.every((b) => inBounds(v, b)) && (!v.pre || set.some((b) => [b[0], b[2]].some((x) => x && x.pre && x.pre !== '0' && x.major === v.major && x.minor === v.minor && x.patch === v.patch))));
}
