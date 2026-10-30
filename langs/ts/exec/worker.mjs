#!/usr/bin/env node
// Lane B's child process: one unit, both sides, under the bound its parent process holds (run.mjs runPair).
//
// The parent forks this file with Node's permission model (--permission, --allow-fs-read for the lean sources and the
// trees of the two files), sends one message {opts}, and waits for {result}. Every step of the run is sent as {crumb}
// before it starts, so that a run the parent kills at the bound names the step, the input and the side it was in. A
// run whose event loop drains before a verdict (a promise nobody settles) answers ASK naming what was pending, as the
// command line's verdict guard does.
import { runPairInProcess, crumbText, onCrumb, absentOutsideReads } from './run.mjs';

absentOutsideReads(); // a path outside the trees this process may read does not exist for the run (run.mjs)

let sent = false;
const reply = (result, drained = false) => { if (sent) return; sent = true; process.send({ result, drained }, () => process.exit(0)); };
process.once('message', async (m) => {
  process.channel?.unref(); // the channel never keeps the run alive: a drained loop is the guard's case below
  onCrumb((c) => { if (!sent) process.send({ crumb: c }); });
  const result = await runPairInProcess(m.opts).catch((e) => ({ verdict: 'ASK', reason: `harness: ${crumbText()}: ${String(e && e.message || e).slice(0, 300)}` })); // an error that escapes the harness is ASK, never a crash
  reply(result);
});
process.on('beforeExit', () => { if (!sent) { process.channel?.ref(); reply({ verdict: 'ASK', reason: `harness: the run ended before a verdict; ${crumbText()}` }, true); } });
