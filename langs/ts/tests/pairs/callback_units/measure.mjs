// Sequential, bounded evidence runner. Each root gets its own process and disk check.
import fs from 'node:fs';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { acquire, release, setOwner } from './census-lock.mjs';
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
  await acquire();
  try {
  const disk = spawnSync('df', ['-k', '/'], { encoding: 'utf8' });
  process.stdout.write(disk.stdout); process.stderr.write(disk.stderr); console.log(`df exit=${disk.status}`);
  if (disk.status !== 0 || Number(disk.stdout.trim().split('\n').at(-1).trim().split(/\s+/)[3]) < 10 * 1024 * 1024) { process.exitCode = 3; break; }
  const args = phase === 'prediction' ? ['langs/ts/reach-gap.mjs', r.root, '--js', '--lean', lean, '--out', out, '--examples', '0']
    : [path.join(lean, 'langs/ts/census.mjs'), r.root, '--js', '--out', out];
  console.log(JSON.stringify([process.execPath, ...args]));
  if (fs.existsSync(out + '.log')) fs.renameSync(out + '.log', `${out}.attempt-${commands.length}.log`);
  fs.writeFileSync(out + '.log', `${JSON.stringify([process.execPath, ...args])}\n${disk.stdout}`);
  const run = await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, args, { env: { ...process.env, JOBS: '2' } });
    setOwner(child.pid);
    child.stdout.on('data', data => { fs.appendFileSync(out + '.log', data); process.stdout.write(data); });
    child.stderr.on('data', data => { fs.appendFileSync(out + '.log', data); process.stderr.write(data); });
    child.on('error', reject); child.on('close', (status, signal) => resolve({ status, signal }));
  });
  release();
  fs.appendFileSync(out + '.log', `\nexit=${run.status} signal=${run.signal}\n`);
  console.log(`exit=${run.status} signal=${run.signal}`);
  commands.push({ ...r, disk: disk.stdout, command: [process.execPath, ...args], exit: run.status, signal: run.signal });
  fs.writeFileSync(commandFile, JSON.stringify(commands, null, 2));
  if (run.status !== 0) { process.exitCode = run.status ?? 1; break; }
  } finally { release(); }
}
