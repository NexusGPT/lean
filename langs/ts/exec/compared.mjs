// The literals a body compares a read against (design/w9ac-compare-literals.md). A guard such as
// `if (nodeData.uniform === undefined)`, `const d = cache.getData(k); if (d === undefined)`, `if (xs.length === 0)` or
// `switch (node.kind) { case 'a': ... }` names the member (or the call) whose answer decides it and the value that takes
// the branch. The world search (search.mjs searchWorld) reads these for the functions a run entered, on both sides, and
// sets a world answer read through that member to that value before it tries the moves its order gives.
//
// Syntax only, per file: the operators === !== == !=, `typeof x === 'undefined'` and the case clauses of a switch; one
// side a literal (undefined, void 0, null, a number, a string, true, false), the other a read: a member `a.k` (key `k`),
// `a['k']`, a call `a.m(...)` or `m(...)` (key `m()`), or a local whose declaration or assignment in the same function
// holds such a read. Each row carries the line range of its innermost function (0 to Infinity at module level).
import { ts } from '../common.mjs';

const EQ = new Set([ts.SyntaxKind.EqualsEqualsEqualsToken, ts.SyntaxKind.ExclamationEqualsEqualsToken, ts.SyntaxKind.EqualsEqualsToken, ts.SyntaxKind.ExclamationEqualsToken]);
const LOOSE = new Set([ts.SyntaxKind.EqualsEqualsToken, ts.SyntaxKind.ExclamationEqualsToken]);
const strip = (e) => { while (e && (ts.isParenthesizedExpression(e) || ts.isNonNullExpression(e) || ts.isAsExpression(e) || ts.isAwaitExpression(e) || (ts.isTypeAssertionExpression?.(e)))) e = e.expression; return e; };

// the world answer kinds (fake.mjs WORLD_KINDS) a literal is, or `lit:<json>` for a value outside that menu; loose
// equality against null or undefined takes both
function kindsOf(e, loose) {
  e = strip(e);
  if (!e) return null;
  const absent = loose ? ['undefined', 'null'] : null;
  if (ts.isIdentifier(e) && e.text === 'undefined') return absent ?? ['undefined'];
  if (ts.isVoidExpression(e)) return absent ?? ['undefined'];
  if (e.kind === ts.SyntaxKind.NullKeyword) return absent ?? ['null'];
  if (e.kind === ts.SyntaxKind.TrueKeyword) return ['true'];
  if (e.kind === ts.SyntaxKind.FalseKeyword) return ['false'];
  if (ts.isNumericLiteral(e)) { const v = Number(e.text); return [v === 0 ? 'zero' : `lit:${JSON.stringify(v)}`]; }
  if (ts.isPrefixUnaryExpression(e) && e.operator === ts.SyntaxKind.MinusToken && ts.isNumericLiteral(e.operand)) { const v = -Number(e.operand.text); return Number.isFinite(v) ? [v === 0 ? 'zero' : `lit:${JSON.stringify(v)}`] : null; }
  if (ts.isStringLiteral(e) || ts.isNoSubstitutionTemplateLiteral(e)) return [e.text === '' ? 'empty' : `lit:${JSON.stringify(e.text)}`];
  return null;
}

// the key a read is answered under in a world path: the member's name, a call's callee name with `()`
function readKey(e) {
  e = strip(e);
  if (!e) return null;
  if (ts.isPropertyAccessExpression(e)) return e.name.text;
  if (ts.isElementAccessExpression(e)) { const a = strip(e.argumentExpression); return a && (ts.isStringLiteral(a) || ts.isNoSubstitutionTemplateLiteral(a)) ? a.text : null; }
  if (ts.isCallExpression(e)) { const c = strip(e.expression); const k = c && (ts.isPropertyAccessExpression(c) ? c.name.text : ts.isIdentifier(c) ? c.text : null); return k ? `${k}()` : null; }
  return null;
}

export function comparedTable(src, fileName) {
  const sf = ts.createSourceFile(fileName, src, ts.ScriptTarget.Latest, true, /x$/.test(fileName) ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const line = (pos) => sf.getLineAndCharacterOfPosition(pos).line + 1;
  const rows = [];
  const visitScope = (scope, from, to) => {
    const locals = new Map(); // a local's name -> the read keys its declarations and assignments in this function hold
    const pending = []; // [identifier text, kinds] compared before every assignment was seen
    const note = (name, init) => { const k = readKey(init); if (k) { if (!locals.has(name)) locals.set(name, new Set()); locals.get(name).add(k); } };
    const add = (side, kinds) => {
      if (!kinds) return;
      const e = strip(side);
      if (e && ts.isIdentifier(e)) { pending.push([e.text, kinds]); return; }
      const k = readKey(e); if (k) rows.push({ key: k, kinds, from, to });
    };
    const walk = (n) => {
      if (n !== scope && ts.isFunctionLike(n) && n.body) { visitScope(n, line(n.getStart(sf)), line(n.end)); return; }
      if (ts.isVariableDeclaration(n) && ts.isIdentifier(n.name) && n.initializer) note(n.name.text, n.initializer);
      if (ts.isBinaryExpression(n) && n.operatorToken.kind === ts.SyntaxKind.EqualsToken && ts.isIdentifier(n.left)) note(n.left.text, n.right);
      if (ts.isBinaryExpression(n) && EQ.has(n.operatorToken.kind)) {
        const loose = LOOSE.has(n.operatorToken.kind);
        for (const [a, b] of [[n.left, n.right], [n.right, n.left]]) {
          const ta = strip(a);
          if (ta && ts.isTypeOfExpression(ta)) { const t = strip(b); if (t && ts.isStringLiteral(t) && t.text === 'undefined') add(ta.expression, ['undefined']); continue; }
          add(a, kindsOf(b, loose));
        }
      }
      if (ts.isSwitchStatement(n)) for (const c of n.caseBlock.clauses) if (ts.isCaseClause(c)) add(n.expression, kindsOf(c.expression, false));
      ts.forEachChild(n, walk);
    };
    ts.forEachChild(scope, walk);
    for (const [name, kinds] of pending) for (const k of locals.get(name) ?? []) rows.push({ key: k, kinds, from, to });
  };
  visitScope(sf, 0, Infinity);
  return rows;
}

// the guide of a run: key -> the kinds the functions enclosing the statements it ran compare that key against
export function guideOf(sitesRan, tableOf) {
  const out = new Map();
  for (const s of sitesRan) {
    const rows = s && s.file ? tableOf(s.file) : null;
    if (!rows) continue;
    for (const r of rows) if (r.from <= s.start && (s.end ?? s.start) <= r.to) { if (!out.has(r.key)) out.set(r.key, new Set()); for (const k of r.kinds) out.get(r.key).add(k); }
  }
  return out;
}

// the key a world path is read under: its last member, a call's `name()` without its count; null for a fault
export function pathKey(p) {
  if (typeof p !== 'string' || p.startsWith('fault:')) return null;
  const i = p.lastIndexOf('.');
  return (i < 0 ? p : p.slice(i + 1)).replace(/#\d+$/, '');
}
