// A long walk (a census over a repository) runs in a child process under a small supervisor (design/2026-10-31-census-partial.md).
// The walk holds the compiler's programs and is the process the kernel's OOM killer picks; a process killed that way
// writes nothing, and the census once ended exit 0 with no message after its walk stopped. The supervisor holds no
// program, so it outlives its walk and says what the walk did.
// The rule, stated once: a walk is complete exactly when its journal holds the `complete` record its walker appends
// last. Any other end (a signal, a non-zero exit, an exit 0 before that record) is partial: the files the supervisor
// planned and no journal record names are the files not walked, and the supervisor exits non-zero.
// The walker appends JSON lines to the journal: `{kind: 'chunk', records: [{file}]...}` per finished chunk (a record's
// `file` is relative to the walk's root), `{kind: 'complete'}` once at the end.
import fs from 'node:fs';
import os from 'node:os';
import { spawn } from 'node:child_process';

export const WALKER_FLAG = '--walker-journal'; // argv of the walker: the journal it appends to
const SUPERVISOR_ENV = 'LEAN_WALK_SUPERVISOR';
const FORWARDED = ['SIGTERM', 'SIGINT', 'SIGHUP'];

// the journal path when this process is a walker, else null
export function walkerJournal(argv = process.argv) {
  const i = argv.indexOf(WALKER_FLAG);
  return i >= 0 ? argv[i + 1] : null;
}
// a walker whose supervisor is gone is reparented; it stops at its next file rather than walk on unwatched
export function assertSupervised() {
  const pid = Number(process.env[SUPERVISOR_ENV]);
  if (pid && process.ppid !== pid) throw new Error(`walk supervisor ${pid} is gone; the walk stops`);
}
// every whole JSON line of a journal (a line cut by a kill mid-append is not a record)
export function readJournal(file) {
  let text = ''; try { text = fs.readFileSync(file, 'utf8'); } catch (e) { if (e.code !== 'ENOENT') throw e; }
  const out = [];
  for (const line of text.split('\n')) { if (!line.trim()) continue; try { out.push(JSON.parse(line)); } catch { /* cut by the kill */ } }
  return out;
}

// Runs `script args` as a walker appending to `journal`, forwards a terminating signal to it, and reads the journal
// when it ends. `planned` is the files the walk is to read, relative to its root, as the walker's records name them.
export function superviseWalk({ script, args, journal, planned }) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [...process.execArgv, script, ...args, WALKER_FLAG, journal], { stdio: 'inherit', env: { ...process.env, [SUPERVISOR_ENV]: String(process.pid) } });
    let received = null;
    const forward = (sig) => { received ??= sig; child.kill(sig); };
    for (const s of FORWARDED) process.on(s, forward);
    child.on('error', (e) => { for (const s of FORWARDED) process.off(s, forward); reject(e); });
    child.on('close', (code, signal) => {
      for (const s of FORWARDED) process.off(s, forward);
      const lines = readJournal(journal);
      const complete = lines.some((l) => l.kind === 'complete');
      const walked = new Set(lines.flatMap((l) => (l.records ?? []).map((r) => r.file)));
      const notWalked = complete ? [] : planned.filter((f) => !walked.has(f));
      resolve({ complete, code, signal, received, lines, walked: walked.size, notWalked, pid: child.pid });
    });
  });
}

// How the walk ended, in words for the message.
export function walkEnd({ code, signal }) {
  return signal ? `was killed by ${signal}` : `exited ${code} before its last record`;
}
// The supervisor's own end: a signal it received is raised again on itself (its caller sees what it sent); otherwise
// the walk's non-zero code, 128 plus the number of the signal that killed the walk, or 1 for a walk that exited 0 early.
export function exitAfter({ complete, code, signal, received }) {
  if (received) { process.kill(process.pid, received); setTimeout(() => process.exit(128 + (os.constants.signals[received] ?? 0)), 1000); return; }
  if (complete) process.exit(code ?? 1);
  process.exit(code ? code : signal ? 128 + (os.constants.signals[signal] ?? 0) : 1);
}
