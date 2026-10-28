#!/usr/bin/env node
// Lane B's child process: one unit, both sides, under the bound its parent process holds (run.mjs runPair).
//
// The parent forks this file with Node's permission model (--permission, --allow-fs-read for the lean sources and the
// trees of the two files), sends one message {opts}, and waits for {result}. Every step of the run is sent as {crumb}
// before it starts, so that a run the parent kills at the bound names the step, the input and the side it was in. A
// run whose event loop drains before a verdict (a promise nobody settles) answers ASK naming what was pending, as the
// command line's verdict guard does.
import fs from 'node:fs';
import { runPairInProcess, crumbText, onCrumb } from './run.mjs';

// a path outside the trees this process may read does not exist for the run: the permission model throws on an
// existence check there (a walk up for a package.json, a config, a values file), where the run asks whether it exists
const exists = fs.existsSync;
fs.existsSync = (p) => { try { return exists(p); } catch (e) { if (e && e.code === 'ERR_ACCESS_DENIED') return false; throw e; } };

let sent = false;
const reply = (result) => { if (sent) return; sent = true; process.send({ result }, () => process.exit(0)); };
process.once('message', async (m) => {
  process.channel?.unref(); // the channel never keeps the run alive: a drained loop is the guard's case below
  onCrumb((c) => { if (!sent) process.send({ crumb: c }); });
  const result = await runPairInProcess(m.opts).catch((e) => ({ verdict: 'ASK', reason: `harness: ${crumbText()}: ${String(e && e.message || e).slice(0, 300)}` })); // an error that escapes the harness is ASK, never a crash
  reply(result);
});
process.on('beforeExit', () => { if (!sent) { process.channel?.ref(); reply({ verdict: 'ASK', reason: `harness: the run ended before a verdict; ${crumbText()}` }); } });
