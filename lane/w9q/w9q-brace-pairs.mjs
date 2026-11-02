// pairs whose parent/candidate hold a regex literal with a `{` that is not {n}, {n,}, {n,m}
import fs from 'node:fs'; import path from 'node:path';
const ts = (await import(path.join(process.argv[2], 'langs/ts/vendor/typescript/lib/typescript.js'))).default;
const dir = process.argv[3]; const hit = new Set();
for (const p of fs.readdirSync(dir)) for (const f of ['parent.ts', 'candidate.ts', 'parent.js', 'candidate.js', 'parent.tsx', 'candidate.tsx']) {
  const file = path.join(dir, p, f); if (!fs.existsSync(file)) continue;
  const sf = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true);
  const visit = (n) => { if (n.kind === ts.SyntaxKind.RegularExpressionLiteral) { const src = n.text.slice(1, n.text.lastIndexOf('/')); if (/\{/.test(src.replace(/\\./g, '').replace(/\{\d+(,\d*)?\}/g, ''))) hit.add(p + ' ' + n.text); } ts.forEachChild(n, visit); };
  visit(sf);
}
console.log([...hit].join('\n') || 'none');
