// Sequential, bounded evidence runner. Each root gets its own process and disk check.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
const W = '/Users/assem/nexus/nexus-organisation/work/unreviewable-throughput/legit/round7/lean-v3';
const phase = process.argv[2], lean = path.resolve(process.argv[3] ?? '.');
const dir = path.resolve('langs/ts/design/callback-units-evidence', phase);
fs.mkdirSync(dir, { recursive: true });
const bugs = `${W}/benchmark/work/bugsjs/repos`;
const roots = [...JSON.parse(fs.readFileSync(`${W}/harness/regress-census-roots.json`)).roots.map(r => ({ ...r, cohort: 'census' })),
  ...fs.readdirSync(bugs).filter(n => fs.statSync(path.join(bugs, n)).isDirectory()).map(name => ({ name, root: path.join(bugs, name), cohort: 'bugsjs' }))];
const commandFile = path.join(dir, 'commands.json');
const commands = fs.existsSync(commandFile) ? JSON.parse(fs.readFileSync(commandFile)) : [];
for (const r of roots) {
  if (phase !== 'prediction' && r.name === 'langchainjs') { console.log('langchainjs: awaits the census memory fix (owner-directed exclusion)'); continue; }
  const out = path.join(dir, `${r.cohort}-${r.name}.json`);
  if (fs.existsSync(out)) { console.log(`saved ${out}`); continue; }
  const disk = spawnSync('df', ['-k', '/'], { encoding: 'utf8' });
  process.stdout.write(disk.stdout); process.stderr.write(disk.stderr); console.log(`df exit=${disk.status}`);
  if (disk.status !== 0 || Number(disk.stdout.trim().split('\n').at(-1).trim().split(/\s+/)[3]) < 10 * 1024 * 1024) process.exit(3);
  const args = phase === 'prediction' ? ['langs/ts/reach-gap.mjs', r.root, '--js', '--lean', lean, '--out', out, '--examples', '0']
    : [path.join(lean, 'langs/ts/census.mjs'), r.root, '--js', '--out', out];
  console.log(JSON.stringify([process.execPath, ...args]));
  const run = spawnSync(process.execPath, args, { encoding: 'utf8', env: { ...process.env, JOBS: '2' }, maxBuffer: 64 * 1024 * 1024 });
  fs.writeFileSync(out + '.log', run.stdout + run.stderr + `\nexit=${run.status} signal=${run.signal}\n`);
  process.stderr.write(run.stderr); console.log(`exit=${run.status} signal=${run.signal}`);
  commands.push({ ...r, disk: disk.stdout, command: [process.execPath, ...args], exit: run.status, signal: run.signal });
  fs.writeFileSync(commandFile, JSON.stringify(commands, null, 2));
  if (run.status !== 0) process.exit(run.status ?? 1);
}
