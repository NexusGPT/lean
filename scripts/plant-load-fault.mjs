// a real runtime import is changed to an unresolved specifier
import fs from 'node:fs';
import { ts } from '../langs/ts/common.mjs';
const file = process.argv[2], missing = process.argv[3];
const source = fs.readFileSync(file, 'utf8');
const emitted = ts.transpileModule(source, { fileName: file, compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020, experimentalDecorators: true, jsx: ts.JsxEmit.ReactJSX } }).outputText;
const runtime = ts.createSourceFile(file, emitted, ts.ScriptTarget.Latest, true);
const names = new Set(runtime.statements.filter(ts.isImportDeclaration).map(n => n.moduleSpecifier.text));
const sf = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true);
const declaration = sf.statements.find(n => ts.isImportDeclaration(n) && names.has(n.moduleSpecifier.text));
if (!declaration) { console.log(JSON.stringify({ skipped: 'no emitted static import' })); process.exit(2); }
const specifier = declaration.moduleSpecifier;
fs.writeFileSync(file, source.slice(0, specifier.getStart(sf)) + JSON.stringify(missing) + source.slice(specifier.getEnd()));
console.log(JSON.stringify({ before: specifier.text, after: missing, line: sf.getLineAndCharacterOfPosition(specifier.getStart(sf)).line + 1 }));
