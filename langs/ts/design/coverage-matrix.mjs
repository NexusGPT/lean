// The language coverage matrix: every TypeScript syntax kind with its unit count over the census (syntax-census.json),
// whether the lint admits it (the lint's expression and statement switches, read mechanically from lint.mjs: a kind
// without a case is refused by the default branch), lean's reading today and the faithful reading (coverage-readings.json),
// then every semantic domain of the concept bench with its inside, translated and witnessed shares. Usage:
//   node coverage-matrix.mjs <absolute syntax-census.json> <absolute concept-bench.json> <absolute out.md>
import fs from 'node:fs';
import path from 'node:path';
import { ts } from '../common.mjs';
const here = path.dirname(new URL(import.meta.url).pathname);
const [censusPath, benchPath, out] = process.argv.slice(2);
if (!censusPath || !benchPath || !out) throw Error('usage: coverage-matrix.mjs <syntax-census.json> <concept-bench.json> <out.md>');
const census = JSON.parse(fs.readFileSync(censusPath, 'utf8'));
const bench = JSON.parse(fs.readFileSync(benchPath, 'utf8'));
const readings = JSON.parse(fs.readFileSync(path.join(here, 'coverage-readings.json'), 'utf8'));
const lint = fs.readFileSync(path.join(here, '../lint/lint.mjs'), 'utf8');
const admitted = new Set([...lint.matchAll(/case K\.([A-Za-z]+)/g)].map((m) => m[1]));
// SyntaxKind names: several names share one value (FirstStatement = VariableStatement); the census printed the first
const K = ts.SyntaxKind; const names = {}; for (const [n, v] of Object.entries(K)) if (typeof v === 'number') (names[v] ??= []).push(n);
const canonical = (n) => { const v = K[n]; const all = names[v] ?? [n]; return all.find((x) => !/^(First|Last)[A-Z]/.test(x)) ?? n; };
const isType = (n) => /QualifiedName|UndefinedKeyword|Type$|Keyword$|TypeReference|TypeLiteral|PropertySignature|IndexSignature|TypeParameter|TypeOperator|^Literal|MappedType|ConditionalType|InferType|TupleType|ArrayType|UnionType|IntersectionType|FunctionType|ParenthesizedType|TypeQuery|ImportType|TemplateLiteralType|NamedTupleMember|RestType|OptionalType|ThisType|TypePredicate/.test(n) && !['ThisKeyword', 'SuperKeyword', 'NullKeyword', 'TrueKeyword', 'FalseKeyword', 'UndefinedKeyword'].includes(n) && !/Expression$/.test(n);
const isToken = (n) => /Token$/.test(n) || /^Jsx(Opening|Closing)/.test(n) || ['JsxAttributes', 'TemplateHead', 'TemplateMiddle', 'TemplateSpan', 'TemplateTail', 'CaseBlock', 'CaseClause', 'DefaultClause', 'VariableDeclarationList', 'HeritageClause', 'ExpressionWithTypeArguments', 'ComputedPropertyName', 'Decorator', 'ShorthandPropertyAssignment' === n ? '' : ''].includes(n);
const units = census.units;
const runtime = [], types = [], tokens = [];
for (const r of census.rows) {
  const n = canonical(r.kind); const row = { kind: n, units: r.units, share: r.share };
  if (isType(n)) types.push(row); else if (isToken(n)) tokens.push(row); else runtime.push(row);
}
const pct = (a, b) => (b ? `${Math.round(1000 * a / b) / 10}%` : '');
let md = `# Language coverage matrix\n\nGenerated ${new Date().toISOString().slice(0, 10)} by \`design/coverage-matrix.mjs\` from \`syntax-census.json\` (${census.roots} roots, ${census.files} files, ${units} top-level units: functions, arrows bound to a const, class methods) and the concept bench at master 03ec3bc (\`results/concept-bench.json\`, 205 concepts, K=10 real instances each). A unit counts once per kind it uses. "Lint" is read from the lint's expression and statement switches: a kind with a case is admitted (its forms may still be refused by a named rule), a kind without one is refused by the default branch (\`unsupported-syntax\`). "Today" and "faithful" come from \`coverage-readings.json\`; the faithful column is the target reading (CLAIM).\n\n## A. Runtime syntax kinds (expressions and statements)\n\n| kind | units | share | lint | reading today | faithful reading |\n|---|---:|---:|---|---|---|\n`;
for (const r of runtime) { const rd = readings[r.kind]; md += `| ${r.kind} | ${r.units} | ${r.share}% | ${admitted.has(r.kind) ? 'admitted' : rd && /^refused/.test(rd.today) ? 'refused' : 'no case (refused by default, or reached through its parent)'} | ${rd ? rd.today : ''} | ${rd ? rd.faithful : ''} |\n`; }
md += `\n## B. Type nodes (erased at runtime; the type reader uses them for shapes) and punctuation tokens\n\n| kind | units | share | class |\n|---|---:|---:|---|\n`;
for (const r of types) md += `| ${r.kind} | ${r.units} | ${r.share}% | type |\n`;
for (const r of tokens) md += `| ${r.kind} | ${r.units} | ${r.share}% | token |\n`;
const rows = bench.rows.slice().sort((a, b) => b.n - a.n || a.concept.localeCompare(b.concept));
const tot = rows.reduce((m, r) => ({ n: m.n + r.n, inside: m.inside + r.inside, translated: m.translated + r.translated, planted: m.planted + r.planted, witnessed: m.witnessed + r.witnessed }), { n: 0, inside: 0, translated: 0, planted: 0, witnessed: 0 });
md += `\n## C. Semantic domains: the concept bench at master 03ec3bc\n\nTotals: ${tot.n} instances, ${tot.inside} inside the subset (${pct(tot.inside, tot.n)}), ${tot.translated} translated (${pct(tot.translated, tot.n)}), ${tot.witnessed} of ${tot.planted} planted mutants witnessed (${pct(tot.witnessed, tot.planted)}). "Lints and translates" = translated / n.\n\n| concept | n | inside | translated | lints and translates | mutants witnessed | top blocker |\n|---|---:|---:|---:|---:|---:|---|\n`;
for (const r of rows) { const top = Object.entries(r.blockers ?? {}).sort((a, b) => b[1] - a[1])[0]; md += `| ${r.concept} | ${r.n} | ${r.inside} | ${r.translated} | ${pct(r.translated, r.n)} | ${r.witnessed}/${r.planted} | ${top ? `${top[0].slice(0, 60)} (${top[1]})` : ''} |\n`; }
md += `\n## D. Where the readings stand\n\n- Runtime kinds admitted by the lint: ${runtime.filter((r) => admitted.has(r.kind)).length} of ${runtime.length}; kinds with a reading written: ${runtime.filter((r) => readings[r.kind]).length}.\n- Units using only admitted runtime kinds are not counted here: admission is per form inside a kind (a named rule), which the concept bench measures per domain (section C).\n- The translate pass of the bench: ${tot.translated} of ${tot.n} instances (${pct(tot.translated, tot.n)}) both lint and translate at master 03ec3bc.\n`;
fs.writeFileSync(out, md);
console.log(JSON.stringify({ runtime: runtime.length, types: types.length, tokens: tokens.length, admitted: runtime.filter((r) => admitted.has(r.kind)).length, withReading: runtime.filter((r) => readings[r.kind]).length, bench: tot }));
