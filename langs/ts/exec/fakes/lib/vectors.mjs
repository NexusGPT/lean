#!/usr/bin/env node
// Records the vector clauses of protocol.mjs against the real packages (design/w2d-library-rows.md): every clause's
// outputs on its generated inputs, written to vectors/<lib>.json with the package and its version. Run with TZ=UTC
// (the dates' clauses read local time, as the packages do); the check (protocol.test.mjs) runs under TZ=UTC too.
//
//   TZ=UTC node exec/fakes/lib/vectors.mjs --real <node_modules with lodash zod dayjs luxon date-fns uuid axios express>
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { LIBS, runLib, responseObservations } from './protocol.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const at = process.argv.indexOf('--real');
if (at < 0 || process.env.TZ !== 'UTC') { console.error('usage: TZ=UTC node vectors.mjs --real <node_modules>'); process.exit(2); }
const real = path.resolve(process.argv[at + 1]);
const req = createRequire(path.join(real, 'x.js'));
const mod = (s) => req(s);
const versionOf = (p) => req(`${p}/package.json`).version;
// a real express response on a request with no socket: what it writes stays in memory, nothing reaches a network
function realResponseOps(ops) {
  const express = req('express');
  const app = express();
  const rq = new http.IncomingMessage(null); rq.method = 'GET'; rq.headers = {}; rq.app = app;
  const res = new http.ServerResponse(rq);
  Object.setPrototypeOf(res, app.response); res.req = rq; res.app = app; rq.res = res;
  return responseObservations(res, ops);
}
async function axiosOutcome(status, vs) {
  const axios = req('axios');
  const validateStatus = { default: undefined, all: null, below500: (s) => s < 500 }[vs];
  const settle = (await import(pathToFileURL(path.join(real, 'axios/lib/core/settle.js')))).default; // axios's own settle, the file its adapters call
  const config = { url: '/x', adapter: (cfg) => new Promise((resolve, reject) => settle(resolve, reject, { status, statusText: '', headers: {}, config: cfg, data: null })) };
  if (vs !== 'default') config.validateStatus = validateStatus;
  try { const r = await axios.request(config); return { ok: r.status }; } catch (e) { return { message: e.message, code: e.code, status: e.response?.status ?? null }; }
}
fs.mkdirSync(path.join(here, 'vectors'), { recursive: true });
for (const lib of LIBS) {
  let outputs;
  try { outputs = await runLib(lib, mod, { responseOps: realResponseOps, axiosOutcome }); }
  catch (e) { console.error(`${lib}: ${e.message}`); process.exitCode = 1; continue; }
  const file = path.join(here, 'vectors', `${lib}.json`);
  fs.writeFileSync(file, JSON.stringify({ package: lib, version: versionOf(lib), tz: 'UTC', outputs }) + '\n');
  console.log(`${lib}@${versionOf(lib)}: ${Object.values(outputs).reduce((s, r) => s + r.length, 0)} outputs over ${Object.keys(outputs).length} clauses -> ${path.relative(process.cwd(), file)}`);
}
