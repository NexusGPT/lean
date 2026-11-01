// the census's new-unit pass (census.mjs --new-units <files>, design/w1h-new-units.md): every unit of the first <files>
// written source files of a root, read as a unit no parent holds (exec/new-unit.mjs), with the root's own tests that
// import the file as the "tests the PR adds". It measures what the reading reaches on real code: how many units load,
// how many inputs the declarations admit, how many calls ask nothing of the world, and the records it writes. A record
// on a census root is a fact about that code as it stands (a throw on an admitted input, a value outside the declared
// return type, a failing test under lean's runner model), never a claim the code is wrong.
import fs from 'node:fs';
import path from 'node:path';
import { ts, topLevelFunctions } from '../common.mjs';
import { runNewFile } from './new-unit.mjs';

const TEST_FILE = /(?:^|[/\\])__tests__(?:[/\\]|$)|\.(?:spec|test)\.[cm]?[jt]sx?$/;
const SKIP_DIR = new Set(['node_modules', 'dist', 'build', '.next', 'coverage', '.git', '.turbo', 'out']);
function testFilesOf(root) {
  const out = [];
  const walk = (d) => { let es; try { es = fs.readdirSync(d, { withFileTypes: true }); } catch { return; } for (const e of es.sort((a, b) => a.name.localeCompare(b.name))) { const p = path.join(d, e.name); if (e.isDirectory()) { if (!SKIP_DIR.has(e.name)) walk(p); } else if (TEST_FILE.test(p) && /\.[cm]?tsx?$/.test(p) && !p.endsWith('.d.ts')) out.push(p); } };
  walk(root);
  return out;
}
// the units the pass reads: a file's named functions and methods (a callback is read through the unit around it)
const unitName = /^[A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)?$/;
const reasonClass = (r) => String(r ?? '').replace(/\(.*$/s, '').replace(/:.*$/s, '').trim().slice(0, 90);

export async function newUnitCensus(root, files, { maxFiles = 50, n = 30, ms = 2000, project = true, log = () => {}, seconds = 300 } = {}) {
  const tests = testFilesOf(root);
  const testText = new Map(tests.map((t) => { try { return [t, fs.readFileSync(t, 'utf8')]; } catch { return [t, '']; } }));
  const out = { files: 0, units: 0, verdicts: {}, loaded: 0, inputs: { drawn: 0, admitted: 0, closed: 0, edge: 0 }, unitsWith: {}, records: {}, coverage: {}, tests: { files: tests.length, selected: 0, passed: 0, failed: 0, notModelled: 0, world: 0, unsettled: 0 }, examples: {}, bound: { maxFiles, n, ms, seconds } };
  const written = files.filter((f) => !TEST_FILE.test(f) && !f.endsWith('.d.ts')).slice(0, maxFiles);
  const t0 = Date.now();
  for (const file of written) {
    let units;
    try { units = [...topLevelFunctions(ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true)).keys()].filter((u) => unitName.test(u)); } catch { continue; }
    if (!units.length) continue;
    out.files++;
    // a test file that names this file's module (its base name in an import) is one of its tests; selection by import
    // resolution is new-tests.mjs's, this only spares loading a test that cannot import it
    const base = path.basename(file).replace(/\.[cm]?tsx?$/, '');
    const mine = tests.filter((t) => new RegExp(`['"][^'"]*[/\\\\.]${base.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:\\.[cm]?[jt]sx?)?['"]`).test(testText.get(t)));
    const results = runNewFile({ candidate: file, units, n, ms, project, seconds, ...(mine.length ? { tests: mine } : {}) });
    for (const r of results) {
      out.units++;
      out.verdicts[r.verdict] = (out.verdicts[r.verdict] ?? 0) + 1;
      if (r.loaded) out.loaded++;
      const d = r.declaration?.inputs; if (d) { out.inputs.drawn += d.drawn; out.inputs.admitted += d.admitted; out.inputs.closed += d.closed; }
      if (r.declaration?.edgeInputs) out.inputs.edge += r.declaration.edgeInputs;
      for (const k of Object.keys(out.tests)) if (k !== 'files' && r.tests?.[k]) out.tests[k] += r.tests[k];
      const kinds = new Set();
      for (const rec of r.records ?? []) {
        if (rec.more) continue;
        kinds.add(rec.kind);
        out.records[rec.kind] = (out.records[rec.kind] ?? 0) + 1;
        if (rec.kind === 'new:coverage') { const c = `${rec.phase}: ${reasonClass(rec.reason)}`; out.coverage[c] = (out.coverage[c] ?? 0) + 1; }
        const ex = (out.examples[rec.kind] ??= []);
        if (ex.length < 8 && rec.kind !== 'new:coverage') ex.push({ file: path.relative(root, file), unit: r.unit, ...rec, claim: undefined });
      }
      for (const k of kinds) out.unitsWith[k] = (out.unitsWith[k] ?? 0) + 1;
    }
    log(`new units: ${out.files} files, ${out.units} units, ${Object.entries(out.unitsWith).map(([k, v]) => `${k} ${v}`).join(', ')}, ${Math.round((Date.now() - t0) / 1000)} s`);
  }
  out.seconds = Math.round((Date.now() - t0) / 1000);
  out.coverage = Object.fromEntries(Object.entries(out.coverage).sort((a, b) => b[1] - a[1]));
  return out;
}

export function newUnitReport(nu) {
  if (!nu) return [];
  const v = (k) => nu.verdicts[k] ?? 0;
  const lines = ['## New units against their declarations (census.mjs --new-units, design/w1h-new-units.md)', '',
    `Every named unit of the first ${nu.bound.maxFiles} written source files, read as a unit no parent holds (${nu.bound.n} inputs each), the root's own tests that import the file as its PR tests: ${nu.files} files, ${nu.units} units (${v('NEW')} NEW, ${v('ASK')} ASK, ${v('REFUSE')} REFUSE), ${nu.loaded} loaded, ${nu.seconds} s.`, '',
    `Inputs: ${nu.inputs.drawn} drawn (${nu.inputs.edge} at an edge value of the declared type), ${nu.inputs.admitted} admitted by the declaration, ${nu.inputs.closed} in a call that asked nothing of the world.`, '',
    '| record | units | records |', '|---|---:|---:|',
    ...['new:fault', 'new:shape', 'new:test', 'new:coverage'].map((k) => `| \`${k}\` | ${nu.unitsWith[k] ?? 0} | ${nu.records[k] ?? 0} |`), '',
    `Tests: ${nu.tests.files} test files in the root; ${nu.tests.selected} tests name a unit read here: ${nu.tests.passed} pass, ${nu.tests.failed} fail, ${nu.tests.world} reached the world, ${nu.tests.notModelled} use what the runner model does not hold, ${nu.tests.unsettled} did not settle.`, '',
    '| coverage reason | records |', '|---|---:|', ...Object.entries(nu.coverage).slice(0, 12).map(([k, c]) => `| ${k.replace(/\|/g, '/')} | ${c} |`), ''];
  for (const k of ['new:fault', 'new:shape', 'new:test']) for (const e of nu.examples[k] ?? []) lines.push(`- \`${k}\` ${e.file} \`${e.unit}\`: ${k === 'new:test' ? `${e.test}: ${e.error?.assertion ?? JSON.stringify(e.error)}` : `input ${JSON.stringify(e.args).slice(0, 120)}${e.edge ? ` (edge of ${e.edge})` : ''} ${k === 'new:fault' ? `${e.how} ${e.error?.name ?? ''}: ${String(e.error?.message ?? '').slice(0, 100)}` : `returned ${JSON.stringify(e.returned).slice(0, 80)} for \`${e.declared}\``}`}`);
  lines.push('');
  return lines;
}
