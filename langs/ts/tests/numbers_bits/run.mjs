// concrete numeric checks compare emitted helpers against JavaScript's operations
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import assert from 'node:assert/strict';
import { translate } from '../../translate/translate.mjs';
import { stable } from '../../exec/fake.mjs';
const here = path.dirname(fileURLToPath(import.meta.url)), out = process.argv[2];
if (!out || !path.isAbsolute(out)) throw new Error('pass an absolute output .dfy path');
assert.equal(new Set([NaN, Infinity, -Infinity, -0, 0, null].map(stable)).size, 6);
let checked = 0;
for (const real of [false, true]) {
  const lit = (x) => Number.isInteger(x) ? `${BigInt(x)}${real ? '.0' : ''}` : String(x);
  const lines = [];
  const check = (name, args, value) => { lines.push(`  expect ${name}(${args.map(lit).join(', ')}) == ${lit(value)};`); checked++; };
  const pairs = [[0,0],[-1,1],[-2147483648,31],[2147483648,32],[4294967295,33],[4294967296,-1],[-4294967297,63],[9007199254740991,4]];
  if (real) pairs.push([-1.75,1.9],[4294967297.5,-33.5]);
  for (const [a,b] of pairs) {
    check('and_bits',[a,b],a&b); check('or_bits',[a,b],a|b); check('xor_bits',[a,b],a^b);
    check('not_bits',[a],~a); check('shift_left',[a,b],a<<b); check('shift_right',[a,b],a>>b); check('shift_unsigned',[a,b],a>>>b);
  }
  for (const a of [-7,-3,0,3,7]) { check('floor_quotient',[a],Math.floor(a/2)); check('trunc_quotient',[a],Math.trunc(a/2)); }
  check('hex_mask',[], -2147483648); check('safe_integer',[],Number.MAX_SAFE_INTEGER);
  if (real) for (const a of [-5.5,-1.7,-1.5,-0.5,0,0.5,1.5,5.5]) {
    check('ceil_number',[a],Math.ceil(a)); check('round_number',[a],Math.round(a)); check('trunc_number',[a],Math.trunc(a)); check('sign_number',[a],Math.sign(a)); check('remainder',[a],a%2.5);
  }
  const source = path.join(here,real ? 'real.ts' : 'probe.ts');
  const result = translate(source,null,{core:true,project:false});
  const dest = real ? out.replace(/\.dfy$/,'.real.dfy') : out;
  fs.writeFileSync(dest,result.main + `\nmethod Main() {\n${lines.join('\n')}\n}\n`);
  const r = spawnSync('dafny',['run','--no-verify','--target:py',dest],{encoding:'utf8'});
  process.stdout.write((r.stdout??'')+(r.stderr??''));
  if (r.status !== 0) process.exit(r.status??1);
}
console.log(`${checked} numeric execution checks and 6 distinct special-value renderings passed`);
