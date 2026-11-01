// The hook table (translate/hooks.json, moonshot 8): library hooks as typed transitions. A listed call reads, in lane
// A, as a transition of the world returning a declared record (a Dafny datatype per hook, its fields typed by the
// table) and, in lane B, as a fake answering a record of that shape with typed fields. The table's type strings are a
// small language: boolean, number, string, a union of string literals (a string), `T | undefined` (an option of the
// type argument when the checker resolves it, else opaque), `Error | null` (opaque), a function type (a handle), and
// handle (opaque); `*` names an index signature (a dictionary).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ts } from './common.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
let table = null;
export function hookTable() { if (!table) table = JSON.parse(fs.readFileSync(path.join(here, 'translate/hooks.json'), 'utf8')); return table; }

// the callee of `n` is a hook of the table when it is an identifier imported from the row's package under the row's name
export function libraryHook(checker, n) {
  if (!ts.isCallExpression(n) || !ts.isIdentifier(n.expression)) return null;
  const sym = checker.getSymbolAtLocation(n.expression); const d = sym?.declarations?.[0]; if (!d) return null;
  let imp = d; while (imp && !ts.isImportDeclaration(imp)) imp = imp.parent;
  if (!imp || !ts.isStringLiteral(imp.moduleSpecifier)) return null;
  const imported = ts.isImportSpecifier(d) ? (d.propertyName ?? d.name).text : null; if (!imported) return null;
  const row = hookTable().hooks.find((h) => h.package === imp.moduleSpecifier.text && h.hook === imported && typeof h.result === 'object'); // a record row; a value row (useContext) keeps the call's own reading
  return row ? { row, name: row.hook, pkg: row.package } : null;
}

// the callee of `n` is a value row of the table (useContext from react): a world read whose result is the call's own type
export function valueHook(checker, n) {
  if (!ts.isCallExpression(n) || !ts.isIdentifier(n.expression)) return null;
  const d = checker.getSymbolAtLocation(n.expression)?.declarations?.[0]; if (!d || !ts.isImportSpecifier(d)) return null;
  let imp = d; while (imp && !ts.isImportDeclaration(imp)) imp = imp.parent;
  if (!imp || !ts.isStringLiteral(imp.moduleSpecifier)) return null;
  const row = hookTable().hooks.find((h) => h.package === imp.moduleSpecifier.text && h.hook === (d.propertyName ?? d.name).text && typeof h.result !== 'object');
  return row ? { row, name: row.hook, pkg: row.package } : null;
}
// the kind of a field's value, from the table's type string
export function fieldKind(typeString) {
  const t = typeString.trim();
  if (t === 'boolean') return 'boolean';
  if (t === 'number') return 'number';
  if (t === 'string' || /^'[^']*'(\s*\|\s*'[^']*')*$/.test(t)) return 'string';
  if (/^T \| undefined$/.test(t)) return 'data';
  if (/=>/.test(t)) return 'function';
  if (t === 'string | string[]') return 'stringOrList';
  return 'opaque';
}
export const dafnyOfKind = { boolean: 'bool', number: (num) => num, string: 'string', data: 'Any', function: 'Any', stringOrList: 'Any', opaque: 'Any' };
// the Dafny datatype of a hook's result: one constructor, the declared fields in table order
export function hookDatatype(row, num = 'int') {
  const name = `Hook_${row.hook}`;
  const fields = Object.entries(row.result).filter(([f]) => f !== '*').map(([f, t]) => { const k = fieldKind(t); const d = typeof dafnyOfKind[k] === 'function' ? dafnyOfKind[k](num) : dafnyOfKind[k]; return { field: f, kind: k, dafny: d }; });
  const text = row.result['*'] ? `type ${name} = map<string, Any>` : `datatype ${name} = ${name}(${fields.map((x) => `${x.field}: ${x.dafny}`).join(', ')})`;
  return { name, fields, text, dictionary: !!row.result['*'] };
}
// lane B: the record spec a fake answers for a listed hook (spec.mjs kinds)
export function hookRecordSpec(row) {
  if (typeof row.result !== 'object') return { kind: 'opaque' }; // a value row: the value is the provider's (useContext), never a record
  if (row.result['*']) return { kind: 'dict', value: { kind: 'string' } };
  const fields = {};
  for (const [f, t] of Object.entries(row.result)) { const k = fieldKind(t); fields[f] = { spec: k === 'boolean' ? { kind: 'boolean' } : k === 'number' ? { kind: 'number' } : k === 'string' ? { kind: 'string' } : k === 'function' ? { kind: 'function' } : { kind: 'opaque' }, optional: false }; }
  return { kind: 'record', fields };
}
// the useContext row: React's own context read. Lane B (exec/run.mjs) reads the nearest provider element above the hook's
// frame in the rendered tree, else the outside value; lane A reads the call as a world read keyed by the context handle,
// since the provider of a unit's root is outside the unit. The row's text is the certificate's assumption.
export function contextRow() { return hookTable().hooks.find((h) => h.package === 'react' && h.hook === 'useContext') ?? null; }
