// How many React components of the corpus are finite machines: every useState slot and every prop a finite type
// (boolean, a union of literals, an enum, null or undefined), so that the product of parent and candidate can be
// explored fully (moonshot 1, integration note section 10). A census, not a translator: imports stay unresolved, so
// a type that needs a package is 'unknown' and counts against finiteness. Usage:
//   node finite-components-census.mjs <absolute concepts-all.json> <absolute output.json>
import fs from 'node:fs';
import path from 'node:path';
import { ts, topLevelFunctions, COMPILER_OPTIONS } from '../common.mjs';
const census = process.argv[2], output = process.argv[3];
if (!census || !output || !path.isAbsolute(census) || !path.isAbsolute(output)) throw Error('pass absolute census and output paths');
const baseline = JSON.parse(fs.readFileSync(census, 'utf8'));
const roots = [];
for (const name of Object.keys(baseline.perRepo).sort()) {
  const report = JSON.parse(fs.readFileSync(path.join(path.dirname(census), 'concepts', name + '.json'), 'utf8'));
  for (const root of report.roots) if (!roots.includes(root)) roots.push(root);
}
const files = [];
const walk = (d) => { let ents; try { ents = fs.readdirSync(d, { withFileTypes: true }); } catch { return; } for (const e of ents) { if (e.name === 'node_modules' || e.name === 'dist' || e.name === 'build' || e.name === '.next' || e.name.startsWith('.')) continue; const p = path.join(d, e.name); if (e.isDirectory()) walk(p); else if (e.isFile() && p.endsWith('.tsx') && !p.endsWith('.d.tsx')) files.push(p); } };
for (const r of roots) walk(r);
files.sort();
const T = ts.TypeFlags;
const hasJsx = (n) => { let found = false; const w = (x) => { if (found) return; if (ts.isJsxElement(x) || ts.isJsxSelfClosingElement(x) || ts.isJsxFragment(x)) { found = true; return; } ts.forEachChild(x, w); }; w(n); return found; };
const isUseState = (c) => ts.isCallExpression(c) && ((ts.isIdentifier(c.expression) && c.expression.text === 'useState') || (ts.isPropertyAccessExpression(c.expression) && c.expression.name.text === 'useState'));
// finite: boolean, a literal, a union of literals (null and undefined allowed), an enum
function classify(checker, t, depth = 0) {
  if (!t) return 'unknown';
  if (t.flags & (T.Any | T.Unknown)) return 'unknown';
  if (t.flags & T.BooleanLike) return 'finite:boolean';
  if (t.flags & (T.StringLiteral | T.NumberLiteral | T.BigIntLiteral | T.EnumLiteral)) return 'finite:literal';
  if (t.flags & (T.Null | T.Undefined | T.Void)) return 'finite:nullish';
  if (t.flags & T.Enum) return 'finite:enum';
  if (t.flags & T.Union) { const parts = t.types.map((p) => classify(checker, p, depth + 1)); return parts.every((p) => p.startsWith('finite')) ? 'finite:union' : parts.find((p) => !p.startsWith('finite')); }
  if (t.flags & T.StringLike) return 'infinite:string';
  if (t.flags & T.NumberLike) return 'infinite:number';
  if (t.flags & T.BigIntLike) return 'infinite:bigint';
  if (t.flags & T.Object) {
    if (checker.getSignaturesOfType(t, ts.SignatureKind.Call).length) return 'opaque:function';
    const sym = t.aliasSymbol ?? t.symbol; const nm = sym?.name ?? '';
    if (['ReactNode', 'ReactElement', 'Element', 'JSX.Element', 'ReactPortal'].includes(nm)) return 'opaque:node';
    if (checker.isArrayType(t) || checker.isTupleType(t)) return 'infinite:array';
    if (depth > 2) return 'infinite:object';
    const props = checker.getPropertiesOfType(t);
    if (!props.length) return 'unknown';
    const parts = props.map((p) => classify(checker, checker.getTypeOfSymbol ? checker.getTypeOfSymbol(p) : checker.getDeclaredTypeOfSymbol(p), depth + 1));
    if (parts.every((p) => p.startsWith('finite') || p.startsWith('opaque'))) return parts.some((p) => p.startsWith('opaque')) ? 'opaque:record' : 'finite:record';
    return parts.find((p) => !p.startsWith('finite') && !p.startsWith('opaque'));
  }
  return 'unknown';
}
const rows = []; const slotClasses = {}; const propClasses = {};
const bump = (m, k) => { m[k] = (m[k] ?? 0) + 1; };
for (let offset = 0; offset < files.length; offset += 80) {
  const chunk = files.slice(offset, offset + 80);
  const options = { ...COMPILER_OPTIONS, jsx: ts.JsxEmit.ReactJSX };
  const host = ts.createCompilerHost(options);
  host.resolveModuleNames = (names) => names.map(() => undefined);
  const program = ts.createProgram(chunk, options, host);
  const checker = program.getTypeChecker();
  for (const file of chunk) {
    const sf = program.getSourceFile(file); if (!sf) continue;
    for (const [name, u] of topLevelFunctions(sf)) {
      const fn = u.node ?? u.fn ?? u; if (!fn || !fn.body || !hasJsx(fn.body)) continue;
      const slots = []; const w = (x) => { if (isUseState(x)) { const rt = checker.getTypeAtLocation(x); const st = checker.getTypeArguments ? checker.getTypeArguments(rt)?.[0] : null; const fromInit = x.arguments[0] ? checker.getBaseTypeOfLiteralType(checker.getTypeAtLocation(x.arguments[0])) : null; // an initialiser's literal widens as React would (useState('a') holds a string)
        const k = classify(checker, (st && !(st.flags & (T.Any | T.Unknown))) ? st : x.typeArguments?.[0] ? checker.getTypeFromTypeNode(x.typeArguments[0]) : fromInit); slots.push(k); bump(slotClasses, k); } ts.forEachChild(x, w); }; w(fn.body);
      const params = fn.parameters ?? [];
      let propsClass = 'none';
      if (params.length) { propsClass = classify(checker, checker.getTypeAtLocation(params[0])); bump(propClasses, propsClass); }
      const slotsFinite = slots.every((s) => s.startsWith('finite'));
      const propsStrict = propsClass === 'none' || propsClass.startsWith('finite');
      const propsLenient = propsStrict || propsClass.startsWith('opaque');
      rows.push({ file: path.relative(path.dirname(census), file), unit: name, slots, propsClass, hasState: slots.length > 0, finiteStrict: slots.length > 0 && slotsFinite && propsStrict, finiteLenient: slots.length > 0 && slotsFinite && propsLenient });
    }
  }
  process.stderr.write(`${Math.min(offset + 80, files.length)}/${files.length} files\r`);
}
const withState = rows.filter((r) => r.hasState);
const summary = { files: files.length, components: rows.length, withState: withState.length, slotsFiniteAll: withState.filter((r) => r.slots.every((s) => s.startsWith('finite'))).length, finiteStrict: withState.filter((r) => r.finiteStrict).length, finiteLenient: withState.filter((r) => r.finiteLenient).length, slotClasses, propClasses };
fs.writeFileSync(output, JSON.stringify({ census, generatedAt: new Date().toISOString(), summary, rows }, null, 1));
console.log(JSON.stringify(summary, null, 1));
