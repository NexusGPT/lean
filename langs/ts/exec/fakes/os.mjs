// `os`: one stated machine, the same on every input and side: Linux on x64, four cores, `/home/lean`, `/tmp`. Each read
// is on the trace as before; the answer is this machine's value instead of a handle.
import { entries, listOf, recordOf } from './common.mjs';

export function osModel(env) {
  const cpu = () => recordOf(env, { model: 'lean virtual cpu', speed: 2400, times: { user: 0, nice: 0, sys: 0, idle: 0, irq: 0 } });
  const calls = {
    platform: () => 'linux', type: () => 'Linux', arch: () => 'x64', release: () => '6.8.0', version: () => '#1 SMP', machine: () => 'x86_64',
    hostname: () => 'lean-host', homedir: () => '/home/lean', tmpdir: () => '/tmp', endianness: () => 'LE',
    cpus: () => listOf(env, [cpu(), cpu(), cpu(), cpu()]), availableParallelism: () => 4, totalmem: () => 8589934592, freemem: () => 4294967296,
    loadavg: () => listOf(env, [0, 0, 0]), networkInterfaces: () => recordOf(env, {}),
    userInfo: () => recordOf(env, { uid: 1000, gid: 1000, username: 'lean', homedir: '/home/lean', shell: '/bin/sh' }),
  };
  return entries({ name: 'os', calls, pure: Object.keys(calls), values: { EOL: () => '\n', devNull: () => '/dev/null' } });
}
