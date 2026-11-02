// The per-callee fact "writes none of its arguments" (lane w8e, design/w8e-callee-facts.md). A call that runs outside
// code may change what it is handed (common.mjs readAfterCall), so a read of a handed object after it is refused or read
// through the world. For a callee lane B runs as code, the fact that it writes none of the objects it is handed (its
// arguments, its receiver, everything they reach) and answers no object of them is CHECKED on the unit's own runs: lane B
// records every call of the call sites of the unit's file (exec/run.mjs factCall), the reachable graph of what each call is
// handed before and after it, and what its answer shares with it. Never assumed:
//   - the lint and the lowering (admission) read an eligible call as one the fact may cover (`pending`): the unit enters
//     the proof lane on the fact's condition;
//   - the translator under check.mjs reads it covered only when lane B's record of this side confirms the fact for the
//     callee (every recorded call of it wrote nothing and shared nothing, at least one recorded); each fact used is an
//     `// ASSUME` line, so the certificate's lanes.A.assumptions names it; without a confirming record the read stays
//     refused as before.
// Eligible: a plain call (no `?.`, no spread, no `new`) whose arguments and receiver hold no function value (a callback
// is the unit's own code, which may write what the callee was never handed), resolved to a function with a body declared
// in another source file of the unit's own package (the files lane B compiles and runs; a package, a Node module or a
// workspace package elsewhere is a fake that writes what it is handed, exec/fake.mjs writeHanded). The key is the callee
// census's (callees.mjs calleeOf): `<file from the package root> <member path>`.
import fs from 'node:fs';
import path from 'node:path';
import { ts } from './common.mjs';
import { calleeOf, calleeKey } from './callees.mjs';
import { broken } from './break.mjs'; // the one --break convention (A6; names in tests/break.mjs)

const roots = new Map();
// the nearest package.json above the file: the package lane B compiles (exec/run.mjs findRoot, the same rule)
export function packageRoot(file) {
  const start = path.dirname(path.resolve(file));
  if (roots.has(start)) return roots.get(start);
  let d = start, out = start;
  for (let i = 0; i < 10; i++) { if (fs.existsSync(path.join(d, 'package.json'))) { out = d; break; } const up = path.dirname(d); if (up === d) break; d = up; }
  roots.set(start, out);
  return out;
}
const strip = (x) => { while (ts.isParenthesizedExpression(x) || ts.isNonNullExpression(x) || ts.isAsExpression(x) || ts.isSatisfiesExpression(x)) x = x.expression; return x; };
// a value of this type may be a function (a callback the callee may run): a call signature on any part
const callable = (checker, t) => !!t && (t.flags & ts.TypeFlags.Union ? t.types : [t]).some((x) => checker.getSignaturesOfType(x, ts.SignatureKind.Call).length > 0);
const hasBody = (d) => !!d && ((ts.isFunctionDeclaration(d) || ts.isMethodDeclaration(d) || ts.isFunctionExpression(d) || ts.isArrowFunction(d)) && !!d.body);

// the call's fact key when the call is eligible (see above), else null
export function factCallee(checker, sf, call) {
  if (!call || !ts.isCallExpression(call) || call.questionDotToken || (call.flags & ts.NodeFlags.OptionalChain)) return null;
  const f = strip(call.expression);
  if (!(ts.isIdentifier(f) || (ts.isPropertyAccessExpression(f) && !ts.isPrivateIdentifier(f.name) && f.expression.kind !== ts.SyntaxKind.SuperKeyword))) return null; // the forms lane B records (factMarks)
  if (ts.isIdentifier(f) && (f.text === 'require' || f.text === 'eval')) return null;
  if (call.arguments.some((a) => ts.isSpreadElement(a) || callable(checker, checker.getTypeAtLocation(a)))) return null;
  if (ts.isPropertyAccessExpression(f) && callable(checker, checker.getTypeAtLocation(f.expression))) return null; // a function value as receiver (f.call, f.bind) runs it
  let d = null; try { d = checker.getResolvedSignature(call)?.declaration ?? null; } catch { d = null; }
  if (!hasBody(d)) return null;
  const dsf = d.getSourceFile();
  if (dsf === sf || dsf.isDeclarationFile || /[\\/]node_modules[\\/]/.test(dsf.fileName)) return null;
  const root = packageRoot(sf.fileName), rel = path.relative(root, dsf.fileName);
  if (rel.startsWith('..') || path.isAbsolute(rel)) return null; // another package: lane B fakes it
  if (/\.(mjs|cjs|js|jsx)$/.test(dsf.fileName) && !/\.(ts|tsx)$/.test(dsf.fileName)) return null;
  let c = null; try { c = calleeOf(checker, sf, call, root); } catch { c = null; }
  if (!c || c.origin !== 'project') return null;
  return calleeKey(c);
}

// The evidence lane B recorded for one side (exec/run.mjs factCall, summed over the side's runs): per call site of the
// side's file, by the call's start position, { calls, checked, wrote, shared, outside, unrecorded, async }. Read against the
// file's own text (the translator may read a rewritten text, translate/faithful.mjs, whose positions differ): per key, the
// fact holds when no recorded site of the key wrote, shared, ran a fake, held a value the record could not read or answered
// a promise, and some site of the key had a checked call. Returns { keys: { <key>: { calls, sites } } }, the confirmed keys.
const failed = (r) => !!(r.wrote || r.shared || r.outside || r.unrecorded || r.async);
const clean = (r) => !!r && r.checked > 0 && !failed(r);
export function confirmedFacts(checker, sf, sites) {
  const per = new Map();
  const w = (n) => { if (ts.isCallExpression(n)) { const key = factCallee(checker, sf, n); if (key) { const r = sites?.[String(n.getStart(sf))]; if (!per.has(key)) per.set(key, []); if (r) per.get(key).push(r); } } ts.forEachChild(n, w); };
  w(sf);
  const keys = {};
  for (const [key, rs] of per) if (rs.length && !rs.some(failed) && rs.some(clean)) keys[key] = { calls: rs.reduce((a, r) => a + (r.checked ?? 0), 0), sites: rs.filter(clean).length };
  return { keys, eligible: [...per.keys()] };
}
// a facts file (translate.mjs --callee-facts): { keys }, as check.mjs writes it
export function readFacts(file) { try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return null; } }
// a decider for the translator: mode 'pending' (admission: eligible is enough), or { keys } (check.mjs: the facts lane B's
// record of this side confirms); null reads no fact. decide(call) -> { key, text } | null
export function factDecider(checker, sf, mode) {
  if (!mode) return null;
  const pending = mode === 'pending', keys = pending ? null : (mode.keys ?? {});
  const decide = (call) => {
    const key = factCallee(checker, sf, call);
    if (!key) return null;
    const what = `callee ${key} writes none of its arguments and answers none of their objects`;
    if (pending) return { key, text: `${what} (pending lane B's record)` };
    if (broken('callee-fact')) return { key, text: `${what} (taken unchecked: LEAN_BREAK=callee-fact)` }; // tests/break.mjs: the fact taken without lane B's record
    const v = keys[key];
    return v ? { key, text: `${what} (lane B: ${v.calls} recorded call(s) at ${v.sites} site(s), none wrote or shared)` } : null;
  };
  return { decide };
}
