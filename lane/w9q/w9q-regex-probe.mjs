// every regex literal of a file through sampleRegex, timed
import fs from 'node:fs'; import path from 'node:path';
const [lean, file] = process.argv.slice(2);
const ts = (await import(path.join(lean, 'langs/ts/vendor/typescript/lib/typescript.js'))).default;
const { sampleRegex } = await import(path.join(lean, 'langs/ts/exec/regex-sample.mjs'));
const sf = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true);
const visit = (n) => { if (n.kind === ts.SyntaxKind.RegularExpressionLiteral) { const t = n.text, src = t.slice(1, t.lastIndexOf('/')); let s = 0x1234; const rng = () => ((s = (s * 1103515245 + 12345) >>> 0) / 2 ** 32); const t0 = Date.now(); let r; try { r = sampleRegex(src, rng); } catch (e) { r = 'throw ' + e.message; } const ms = Date.now() - t0; if (ms > 50) console.log(ms + ' ms', sf.getLineAndCharacterOfPosition(n.getStart()).line + 1, t, JSON.stringify(r)?.slice(0, 80)); } ts.forEachChild(n, visit); };
visit(sf);
console.log('done');
