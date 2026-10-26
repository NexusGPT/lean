// Moonshot 10: the front-end mutation benchmark. Six mechanical mutation operators applied to real corpus
// components, each mutant run through lane B's one-render check against its parent; the table of verdicts per
// operator is the catch rate per layer. No dataset of component regressions exists anywhere (research 18, 19);
// this builds lean's own. Usage:
//   node mutate-components.mjs <absolute finite-components-census.json> <absolute out dir> [--count 30] [--n 20]
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { ts, topLevelFunctions } from '../common.mjs';
const here = path.dirname(new URL(import.meta.url).pathname);
const args = process.argv.slice(2);
const census = args[0], outDir = args[1];
if (!census || !outDir || !path.isAbsolute(census) || !path.isAbsolute(outDir)) throw Error('pass absolute census json and output dir');
const opt = (k, d) => (args.includes(k) ? args[args.indexOf(k) + 1] : d);
const COUNT = Number(opt('--count', 30)), N = Number(opt('--n', 20));
const data = JSON.parse(fs.readFileSync(census, 'utf8'));
const censusRoot = path.dirname(data.census);
const repoRoot = path.join(censusRoot, 'repos');
const K = ts.SyntaxKind;
const isJsx = (x) => { while (ts.isParenthesizedExpression(x)) x = x.expression; return ts.isJsxElement(x) || ts.isJsxSelfClosingElement(x) || ts.isJsxFragment(x); };
const hookName = (c) => ts.isCallExpression(c) ? (ts.isIdentifier(c.expression) ? c.expression.text : ts.isPropertyAccessExpression(c.expression) ? c.expression.name.text : null) : null;
const first = (root, pred) => { let found = null; const w = (n) => { if (found) return; if (pred(n)) { found = n; return; } ts.forEachChild(n, w); }; w(root); return found; };
// each operator returns one text edit {start, end, text} inside the unit, or null when it does not apply
const OPERATORS = {
  'drop-dep': (fn, sf) => { const c = first(fn.body, (n) => ['useEffect', 'useLayoutEffect', 'useMemo', 'useCallback'].includes(hookName(n)) && n.arguments[1] && ts.isArrayLiteralExpression(n.arguments[1]) && n.arguments[1].elements.length >= 1); if (!c) return null; const arr = c.arguments[1]; const kept = arr.elements.slice(0, -1).map((e) => e.getText(sf)); return { start: arr.getStart(sf), end: arr.getEnd(), text: `[${kept.join(', ')}]` }; },
  'swap-setters': (fn, sf) => { const h = first(fn.body, (n) => (ts.isArrowFunction(n) || ts.isFunctionExpression(n)) && n.body && ts.isBlock(n.body) && n.body.statements.some((s, i) => i + 1 < n.body.statements.length && isSetCall(s) && isSetCall(n.body.statements[i + 1]))); if (!h) return null; const st = h.body.statements; const i = st.findIndex((s, j) => j + 1 < st.length && isSetCall(s) && isSetCall(st[j + 1])); const a = st[i], b = st[i + 1]; return { start: a.getStart(sf), end: b.getEnd(), text: `${b.getText(sf)}\n${a.getText(sf)}` }; },
  'key-index': (fn, sf) => { const attr = first(fn.body, (n) => ts.isJsxAttribute(n) && n.name.getText(sf) === 'key' && n.initializer && ts.isJsxExpression(n.initializer) && n.initializer.expression && !ts.isNumericLiteral(n.initializer.expression) && insideMapWithIndex(n) && n.initializer.expression.getText(sf) !== insideMapWithIndex(n)); if (!attr) return null; /* a key that is already the index is no mutation */ const idx = insideMapWithIndex(attr); return { start: attr.initializer.expression.getStart(sf), end: attr.initializer.expression.getEnd(), text: idx }; },
  'remove-cleanup': (fn, sf) => { const c = first(fn.body, (n) => ['useEffect', 'useLayoutEffect'].includes(hookName(n)) && n.arguments[0] && ts.isArrowFunction(n.arguments[0]) && ts.isBlock(n.arguments[0].body) && n.arguments[0].body.statements.some((s) => ts.isReturnStatement(s) && s.expression && (ts.isArrowFunction(s.expression) || ts.isFunctionExpression(s.expression)))); if (!c) return null; const ret = c.arguments[0].body.statements.find((s) => ts.isReturnStatement(s) && s.expression && (ts.isArrowFunction(s.expression) || ts.isFunctionExpression(s.expression))); return { start: ret.getStart(sf), end: ret.getEnd(), text: '' }; },
  'flip-conditional': (fn, sf) => { const b = first(fn.body, (n) => ts.isBinaryExpression(n) && n.operatorToken.kind === K.AmpersandAmpersandToken && isJsx(n.right)); if (b) return { start: b.left.getStart(sf), end: b.left.getEnd(), text: `!(${b.left.getText(sf)})` }; const c = first(fn.body, (n) => ts.isConditionalExpression(n) && (isJsx(n.whenTrue) || isJsx(n.whenFalse))); if (!c) return null; return { start: c.whenTrue.getStart(sf), end: c.whenFalse.getEnd(), text: `${c.whenFalse.getText(sf)} : ${c.whenTrue.getText(sf)}` }; },
  'change-text': (fn, sf) => { const t = first(fn.body, (n) => ts.isJsxText(n) && n.text.trim().length > 0); if (!t) return null; const full = t.getText(sf); const i = full.search(/\S/); const j = full.search(/\S\s*$/) + 1; return { start: t.getStart(sf) + i, end: t.getStart(sf) + j, text: full.slice(i, j) + '.' }; },
};
function isSetCall(s) { return ts.isExpressionStatement(s) && ts.isCallExpression(s.expression) && ts.isIdentifier(s.expression.expression) && /^set[A-Z]/.test(s.expression.expression.text); }
function insideMapWithIndex(n) { for (let a = n.parent; a; a = a.parent) { if ((ts.isArrowFunction(a) || ts.isFunctionExpression(a)) && a.parent && ts.isCallExpression(a.parent) && ts.isPropertyAccessExpression(a.parent.expression) && a.parent.expression.name.text === 'map') { const p = a.parameters[1]; return p && ts.isIdentifier(p.name) ? p.name.text : null; } } return null; }
// the components: stateful, inside the census repos, one per file, the first COUNT by file order
const rows = data.rows.filter((r) => r.hasState && !r.file.startsWith('..') && !r.unit.includes('.'));
const seen = new Set(); const picked = [];
for (const r of rows) { if (seen.has(r.file)) continue; const abs = path.join(censusRoot, r.file); if (!abs.startsWith(repoRoot) || !fs.existsSync(abs)) continue; seen.add(r.file); picked.push({ ...r, abs }); if (picked.length >= COUNT) break; }
fs.mkdirSync(outDir, { recursive: true });
const results = [];
for (const [i, c] of picked.entries()) {
  const src = fs.readFileSync(c.abs, 'utf8');
  const sf = ts.createSourceFile(c.abs, src, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const u = topLevelFunctions(sf).get(c.unit); if (!u || !u.body) continue;
  const dir = path.join(outDir, `${String(i).padStart(2, '0')}-${c.unit}`); fs.mkdirSync(dir, { recursive: true });
  const parent = path.join(dir, 'parent.tsx'); fs.writeFileSync(parent, src);
  for (const [op, make] of Object.entries(OPERATORS)) {
    let edit = null; try { edit = make(u.fn, sf); } catch (e) { results.push({ unit: c.unit, file: c.file, op, applicable: false, error: String(e.message).slice(0, 80) }); continue; }
    if (!edit) { results.push({ unit: c.unit, file: c.file, op, applicable: false }); continue; }
    const mutated = src.slice(0, edit.start) + edit.text + src.slice(edit.end);
    const cand = path.join(dir, `${op}.tsx`); fs.writeFileSync(cand, mutated);
    const out = path.join(dir, `${op}.json`);
    const r = spawnSync('node', [path.join(here, '../exec/run.mjs'), '--parent', parent, '--candidate', cand, '--unit', c.unit, '--no-project', '--n', String(N), '--ms', '2000', '--out', out], { encoding: 'utf8', timeout: 180000 });
    let v = {}; try { v = JSON.parse(fs.readFileSync(out, 'utf8')); } catch { v = { verdict: 'CRASH', reason: (r.stderr || r.stdout || '').trim().slice(-160) }; }
    const where = v.witnesses?.[0]?.where?.field ?? null;
    results.push({ unit: c.unit, file: c.file, op, applicable: true, verdict: v.verdict, where, reason: v.reason ?? null, edit: edit.text.slice(0, 60) });
    process.stderr.write(`${i + 1}/${picked.length} ${c.unit} ${op}: ${v.verdict}${where ? ' (' + where + ')' : ''}${v.reason ? ' ' + String(v.reason).slice(0, 60) : ''}\n`);
  }
}
const table = {};
for (const op of Object.keys(OPERATORS)) { const rs = results.filter((r) => r.op === op); const ap = rs.filter((r) => r.applicable); table[op] = { applicable: ap.length, of: rs.length }; for (const r of ap) table[op][r.verdict] = (table[op][r.verdict] ?? 0) + 1; const w = ap.filter((r) => r.verdict === 'WITNESS'); table[op].witnessLayers = w.reduce((m, r) => { m[r.where ?? 'unknown'] = (m[r.where ?? 'unknown'] ?? 0) + 1; return m; }, {}); }
fs.writeFileSync(path.join(outDir, 'mutation-benchmark.json'), JSON.stringify({ census, generatedAt: new Date().toISOString(), components: picked.map((p) => ({ unit: p.unit, file: p.file })), n: N, table, results }, null, 1));
console.log(JSON.stringify(table, null, 1));
