// translate/opaque.mjs on its own (design/w1a-opaque-mutation.md): the key is the construct's tokens (a comment or a
// line break is no change, every literal is one: two URLs are two symbols), the step's shape, the column, and the
// reference test a mutation-family block starts from. `--break` checks the drop-read switch removes one read.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { ts, loadProgram } from '../common.mjs';
import { opaqueText, opaqueKey, opaqueForm, opaqueGrade, gradedRule, heapOperation, blockStart, prefixDeclaration } from '../translate/opaque.mjs';

if (process.argv.includes('--break')) process.env.LEAN_BREAK = 'opaque-drop-read'; // the mechanism removed: one read dropped, so the step checks below go red
const failures = [];
const check = (ok, what) => { if (!ok) failures.push(what); };
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'opaque-unit-'));
const file = path.join(dir, 'a.ts');
fs.writeFileSync(file, [
  'declare const svc: { send(s: string): void; tick(n: number): void };',
  'type U = { n: number; tags: string[] };',
  'export function f(u: U, k: number, s: string) {',
  '  const a = k + 1; // a comment',
  '  if (a > 3) return 0;',
  '  svc.tick(a);',
  '  fetch("http://a.example");',
  '  fetch("http://b.example");',
  '  fetch( "http://a.example" ) /* other */ ;',
  '  const t = u.tags;',
  '  t.push(s);',
  '  u.n = 1;',
  '  svc.send(`${u}`);',
  '  const n = u.tags.length;',
  '  return n;',
  '}',
  ''].join('\n'));
const { sf, checker } = loadProgram(file, { project: false });
const fn = sf.statements.find((s) => ts.isFunctionDeclaration(s));
const st = fn.body.statements;
// the key: tokens, not characters
check(opaqueText([st[3]], sf) === opaqueText([st[5]], sf), `a comment or spacing changed the text: ${opaqueText([st[3]], sf)} | ${opaqueText([st[5]], sf)}`);
check(opaqueText([st[3]], sf) !== opaqueText([st[4]], sf), 'two URLs read as one text (a // inside a string was cut)');
check(!opaqueText([st[0]], sf).includes('comment'), 'a comment is part of the key');
check(opaqueKey(['a', 'b']) !== opaqueKey(['ab']) && /^[0-9a-f]{40}$/.test(opaqueKey(['x'])), 'the key is sha1 over separated parts');
// the step
const decl = [];
const external = (id, ins, out) => { decl.push({ id, ins, out }); return `ext_${id}`; };
const step = opaqueForm({ id: 'block_x', external, world: 'wld', inputs: [{ code: 'k', d: 'int' }, { code: 'u', d: 'U' }], outputs: [{ name: 'u', d: 'U' }], ret: { name: 'retb', d: 'int', terminal: false } });
check(step.line === 'var (wld, retb, u) := ext_block_x(wld, k, u);', `step line ${step.line}`);
check(decl[0].ins.join(',') === 'World,int,U' && decl[0].out === '(World, Option<int>, U)', `step signature ${JSON.stringify(decl[0])}`);
// the column
check(opaqueGrade('alias-mutation') === 'block' && opaqueGrade('dynamic-eval') === 'none', 'the opaque column');
check(gradedRule('a.ts:12: alias-mutation: `t` is ...') === 'alias-mutation' && gradedRule('read-after-call: x') === null, 'a translator refusal\'s graded rule');
// references
const why = (i) => heapOperation(checker, st[i])?.why ?? null;
check(why(0) === null && why(1) === null && why(2) === null, `a primitive statement touches no reference: ${why(0)}, ${why(1)}, ${why(2)}`);
check(why(6) === 'binds a reference to a name', `const t = u.tags: ${why(6)}`);
check(why(7) === 'calls a method on a reference', `t.push(s): ${why(7)}`);
check(why(8) === 'writes a field, an element or a pattern', `u.n = 1: ${why(8)}`);
check(why(9) === 'converts an object implicitly', `\`\${u}\`: ${why(9)}`);
check(why(10) === null, `const n = u.tags.length: ${why(10)}`);
check(blockStart(checker, [...st], (s) => s === st[7]) === 7, `a path alias of a parameter (const t = u.tags) is a prefix declaration; the block starts at the site: ${blockStart(checker, [...st], (s) => s === st[7])}`);
check(blockStart(checker, [...st], (s) => s === st[10]) === 7, `the block starts at the first reference operation that is not a prefix declaration (t.push): ${blockStart(checker, [...st], (s) => s === st[10])}`);
check(prefixDeclaration(checker, st[6]) && !prefixDeclaration(checker, st[11]), 'a path alias is a prefix declaration; a primitive declaration is not one (it needs none)');
check(blockStart(checker, [...st], () => false) === -1, 'no site, no block');
fs.rmSync(dir, { recursive: true, force: true });
if (failures.length) { for (const f of failures) console.error(`FAIL ${f}`); process.exit(1); }
console.log('opaque-unit: the key is the construct\'s tokens (comments and layout no change, two URLs two symbols), the step\'s shape and signature, the column, and the reference test a block starts from');
