// The same-file callees of a unit and the normalised text of every unit: what a WITNESS in a unit whose own text did
// not change came through.
//
//   calleesOf(sf, checker, unit)  the same-file units the unit calls or references, directly and through same-file
//                                 callees (originOf kind `unit`), in the order they are first met, each with the path
//                                 of units that reaches it
//   unitText(sf, unit)            the unit's text with comments and whitespace dropped (the compiler's printer, comments
//                                 removed), and its sha256
//   calleeWitness(parent, candidate, unit)
//                                 for one unit of two versions of a file: whether its own text is equal on both sides,
//                                 and every callee on either side's call graph whose text differs (or that exists on one
//                                 side only), as [{ callee, changed: true, path }]
//
// A callee is read without the project: a same-file unit resolves inside the file alone, so the reading is the same
// whatever the checkout holds. A reference that is not a call (a unit passed as a callback) counts: it runs.
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { ts, loadProgram, topLevelFunctions, originOf } from '../common.mjs';

const printer = ts.createPrinter({ removeComments: true, newLine: ts.NewLineKind.LineFeed });

// the unit's text as the printer writes it without comments, every run of whitespace one space
export function unitText(sf, unit) {
  const u = typeof unit === 'string' ? topLevelFunctions(sf).get(unit) : unit;
  if (!u) return null;
  const text = printer.printNode(ts.EmitHint.Unspecified, u.node, sf).replace(/\s+/g, ' ').trim();
  return { text, sha256: createHash('sha256').update(text).digest('hex').slice(0, 16) };
}

// the unit name a declaration originOf calls `unit` belongs to
function unitNameOf(decl) {
  if (!decl) return null;
  if (ts.isMethodDeclaration(decl) && decl.name && ts.isIdentifier(decl.name) && decl.parent && ts.isClassDeclaration(decl.parent) && decl.parent.name) return `${decl.parent.name.text}.${decl.name.text}`;
  if ((ts.isFunctionDeclaration(decl) || ts.isVariableDeclaration(decl)) && decl.name && ts.isIdentifier(decl.name)) return decl.name.text;
  return null;
}

// the same-file units one unit names directly, in source order
function directCallees(sf, checker, units, u) {
  const out = [];
  const visit = (n) => {
    if (ts.isIdentifier(n)) {
      const o = originOf(checker, n, sf, u.fn);
      if (o.kind === 'unit') { const name = unitNameOf(o.decl); if (name && name !== u.name && units.has(name) && !out.includes(name)) out.push(name); }
    }
    ts.forEachChild(n, visit);
  };
  visit(u.node);
  return out;
}

// every same-file unit reachable from `unit`, breadth first, with the first path that reaches it
export function calleesOf(sf, checker, unit) {
  const units = topLevelFunctions(sf);
  const root = units.get(unit);
  if (!root) return [];
  const seen = new Map([[unit, [unit]]]); const order = []; const queue = [unit];
  while (queue.length) {
    const name = queue.shift();
    for (const c of directCallees(sf, checker, units, units.get(name))) {
      if (seen.has(c)) continue;
      seen.set(c, [...seen.get(name), c]); order.push(c); queue.push(c);
    }
  }
  return order.map((name) => ({ callee: name, path: seen.get(name) }));
}

// one side: its units' texts and the unit's callees
function sideOf(file, unit) {
  const { sf, checker } = loadProgram(file, { project: false });
  const units = topLevelFunctions(sf);
  const texts = new Map(); for (const [name, u] of units) texts.set(name, unitText(sf, u));
  return { texts, callees: units.has(unit) ? calleesOf(sf, checker, unit) : [] };
}

export function calleeWitness(parent, candidate, unit) {
  if (!parent || !candidate || !fs.existsSync(parent) || !fs.existsSync(candidate)) return null;
  const P = sideOf(parent, unit), C = sideOf(candidate, unit);
  const own = (s) => s.texts.get(unit)?.sha256 ?? null;
  const unitTextEqual = own(P) !== null && own(P) === own(C);
  // the candidate's call graph first (what ran on that side), then what only the parent's reached
  const reached = new Map(); for (const x of [...C.callees, ...P.callees]) if (!reached.has(x.callee)) reached.set(x.callee, x.path);
  const through = [];
  for (const [callee, path] of reached) {
    const a = P.texts.get(callee)?.sha256 ?? null, b = C.texts.get(callee)?.sha256 ?? null;
    if (a !== b) through.push({ callee, changed: true, path, ...(a === null ? { side: 'candidate only' } : b === null ? { side: 'parent only' } : {}) });
  }
  return { unitTextEqual, unitSha256: { parent: own(P), candidate: own(C) }, through };
}

// the unit's own text on both sides, equal or not (a parse only, no checker): null when a side lacks the file or the unit
export function unitTextEqual(parent, candidate, unit) {
  const textOf = (file) => { if (!file || !fs.existsSync(file)) return null; const sf = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true, /x$/.test(file) ? ts.ScriptKind.TSX : ts.ScriptKind.TS); return unitText(sf, unit)?.sha256 ?? null; };
  const a = textOf(parent), b = textOf(candidate);
  return a === null || b === null ? null : a === b;
}

// a WITNESS result of runPair gains the callees its difference may have come through: each witness carries `through`
// when a callee changed, and `where.cause = 'callee'` when the unit's own text is equal on both sides (the observation
// is real; the cause is named). The result carries unitTextEqual for the certificate.
export function annotateWitness(res, parent, candidate, unit) {
  if (!res || res.verdict !== 'WITNESS' || !Array.isArray(res.witnesses)) return res;
  let cw = null;
  try { cw = calleeWitness(parent, candidate, unit); } catch (e) { res.calleeReading = `callees not read: ${String(e && e.message).slice(0, 160)}`; return res; }
  if (!cw) return res;
  res.unitTextEqual = cw.unitTextEqual;
  if (!cw.through.length) return res;
  for (const w of res.witnesses) {
    w.through = cw.through;
    if (cw.unitTextEqual) w.where = { ...(w.where ?? {}), cause: 'callee' };
  }
  return res;
}
