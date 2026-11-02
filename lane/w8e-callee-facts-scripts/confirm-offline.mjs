// w8e: per sampled unit, the pending facts it entered on and which of them lane B's record (bound.calleeFacts.candidate,
// in the check's certificate) confirms, read with callee-facts.mjs confirmedFacts on the file as it is
//   node confirm-offline.mjs <tree> <confirm.jsonl> <root>
import fs from 'node:fs'; import path from 'node:path';
const [tree, rowsFile, root] = process.argv.slice(2);
const { loadProgram } = await import(path.join(tree, 'langs/ts/common.mjs'));
const { confirmedFacts } = await import(path.join(tree, 'langs/ts/callee-facts.mjs'));
const rows = fs.readFileSync(rowsFile, 'utf8').trim().split('\n').map(JSON.parse);
let all = 0, some = 0, keysN = 0, keysOk = 0; const why = {};
rows.forEach((r, i) => {
  const v = JSON.parse(fs.readFileSync(path.join(path.dirname(rowsFile), `confirm-${i + 1}.json`), 'utf8'));
  const sites = v.certificate?.lanes?.B?.bound?.calleeFacts?.candidate ?? {};
  const L = loadProgram(path.join(root, r.file), { project: true });
  const { keys } = confirmedFacts(L.checker, L.sf, sites);
  const ok = r.keys.filter((k) => keys[k]);
  keysN += r.keys.length; keysOk += ok.length; if (ok.length === r.keys.length) all++; if (ok.length) some++;
  for (const s of Object.values(sites)) for (const k of ['wrote', 'shared', 'outside', 'unrecorded', 'async']) if (s[k]) why[k] = (why[k] ?? 0) + 1;
  console.log(`${r.unit} ${ok.length}/${r.keys.length} confirmed: ${r.keys.map((k) => `${k.split(' ').pop()}${keys[k] ? '+' : '-'}`).join(' ')}`);
});
console.log(JSON.stringify({ units: rows.length, allConfirmed: all, someConfirmed: some, keys: keysN, keysConfirmed: keysOk, siteFailures: why }));
