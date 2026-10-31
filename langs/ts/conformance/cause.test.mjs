#!/usr/bin/env node
// A disagreement's cause (cause.mjs) on the difference the bridge itself writes (bridge.mjs agree), for a model whose
// TypeScript bigint is `type BigInt = int` (translate.mjs):
//   two exact bigints that differ        -> a bigint value difference, both values in the label;
//   the model's integer, Node's binary64 -> past 2^53 when Node's number is beyond 2^53, else an integer value;
//   a bigint's digits past 2^53          -> never past 2^53 (they are exact).
// Prints one line per case and `CAUSE TOTAL: N of M PASS`; exits 1 on a failed case.
import { makeBridge } from './bridge.mjs';
import { causeOf } from './cause.mjs';

const bridge = makeBridge({ M: {}, D: {}, decls: { datatypes: new Map(), synonyms: new Map([['BigInt', { type: { text: 'int' } }]]) } });
const int = (digits) => ({ toFixed: () => digits }); // a model integer as Dafny's runtime holds it (BigNumber: toFixed is its digits)
const BigIntT = { k: 'name', name: 'BigInt', args: [], text: 'BigInt' }, IntT = { k: 'name', name: 'int', args: [], text: 'int' };
const cases = [];
const check = (name, x, t, rendered, want) => {
  let ok = false, detail;
  try { const d = bridge.agree(int(x), t, rendered); const c = d ? causeOf(d, null, []) : null; ok = want === null ? d === null : c === want; detail = `${d ?? 'agree'} -> ${c}`; } catch (e) { detail = `threw: ${e.message}`; }
  cases.push(ok); console.log(`${ok ? 'PASS' : 'FAIL'} ${name}: ${detail}`);
};
check('two equal bigints agree', '1842', BigIntT, { $bigint: '1842' }, null);
check('two exact bigints that differ: a value difference', '1842', BigIntT, { $bigint: '1843' }, 'a bigint value difference: the model 1842n, Node 1843n');
check('two exact bigints past 2^53 that differ: still a value difference', '90071992547409930', BigIntT, { $bigint: '90071992547409931' }, 'a bigint value difference: the model 90071992547409930n, Node 90071992547409931n');
check('a negative bigint: a value difference', '-7', BigIntT, { $bigint: '7' }, 'a bigint value difference: the model -7n, Node 7n');
check('the model exact, Node a number past 2^53: past 2^53', '9007199254740993', IntT, 9007199254740992, 'an integer past 2^53: the model is exact, Node rounds to binary64');
check('the model exact, Node a small number: an integer value', '5', IntT, 6, 'integer value');
const pass = cases.filter(Boolean).length;
console.log(`CAUSE TOTAL: ${pass} of ${cases.length} PASS`);
process.exit(pass === cases.length ? 0 : 1);
