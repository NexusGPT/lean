// A preview may invoke git. Every lane process and sandbox execution is recorded and rejected.
import fs from 'node:fs';
import cp from 'node:child_process';
import vm from 'node:vm';
import { syncBuiltinESMExports } from 'node:module';
const stop = (kind) => {
  fs.appendFileSync(process.env.LEAN_INTAKE_AUDIT, kind + '\n');
  throw new Error('Preview started a lane: ' + kind);
};
for (const name of ['spawnSync', 'spawn', 'execFile', 'execFileSync', 'exec', 'execSync', 'fork']) {
  const original = cp[name];
  cp[name] = function (command, ...args) {
    if (command !== 'git') stop(name + ' ' + command);
    return original.call(this, command, ...args);
  };
}
for (const name of ['runInContext', 'runInNewContext', 'runInThisContext', 'compileFunction']) vm[name] = () => stop('sandbox ' + name);
const read = fs.readFileSync;
fs.readFileSync = function (file, ...args) {
  if (typeof file === 'string' && /(?:^|[/\\])\.env(?:\..*)?$/.test(file)) stop('secret read');
  return read.call(this, file, ...args);
};
syncBuiltinESMExports();
