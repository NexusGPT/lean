#!/usr/bin/env node
// One-off check of lane B's coverage contract (design/heap-stage5.md 20c): every lane-B row of every pair that expects
// PASS-bounded is run again through the routes the source gives the unit, outside lane B's own receiver: a free function
// is called; a method is called on an instance its constructor built (the constructor's arguments drawn from its unit,
// none when the class declares none); a static member through the class; a getter by reading the property of such an
// instance; a constructor by `new`. Both sides load apart from lane B's loader (plainLoader: TypeScript's own emit,
// its __decorate untouched; an outside import is lane B's fake module) and draw lane B's inputs (inputPlan, input i on
// Environment(seed * 7919 + i)).
// A row is printed when, on a drawn input, the two sides return or throw different values or leave different fields on
// the instance. An input on which the two constructors already built different instances is the constructor's (as
// programs.mjs reads it): it is counted, and the constructor's own row must then not be PASS-bounded. The script prints
// the rows it could not drive (another unit form, a load or construction that failed)
// with their reason, and exits 1 when a row differs.
//
//   node langs/ts/tests/lane-b-routes.mjs [--pairs a,b] [--n 30]
//   node langs/ts/tests/lane-b-routes.mjs --one <pair dir>      (one pair, in a child of the first form)
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const pairsDir = path.join(here, 'pairs');
const argv = process.argv.slice(2);
const opt = (k, d) => (argv.includes(k) ? argv[argv.indexOf(k) + 1] : d);
const N = Number(opt('--n', 30)), SEED = 1, MS = 2000;
const pairFile = (d, side) => (fs.existsSync(path.join(d, side + '.tsx')) ? path.join(d, side + '.tsx') : path.join(d, side + '.ts'));

if (opt('--one', null)) {
  globalThis.__leanLateHooks = true; // run.mjs ends the process on an error that escapes a unit outside its runs: here such an error is the side's
  process.on('unhandledRejection', () => {}); process.on('uncaughtException', () => {});
  const { sandbox, inputPlan, findRoot } = await import('../exec/run.mjs');
  const { Environment, render } = await import('../exec/fake.mjs');
  const { specOf, argsFor } = await import('../exec/spec.mjs');
  const { inputsFor } = await import('../exec/gen.mjs');
  const { ts, topLevelFunctions, fileClassFieldsDefine } = await import('../common.mjs');
  const d = opt('--one'), exp = JSON.parse(fs.readFileSync(path.join(d, 'expect.json'), 'utf8'));
  const files = { parent: pairFile(d, 'parent'), candidate: pairFile(d, 'candidate') };
  const project = !(exp.project === false);
  const inventory = Object.fromEntries(Object.entries(files).map(([k, f]) => [k, topLevelFunctions(ts.createSourceFile(f, fs.readFileSync(f, 'utf8'), ts.ScriptTarget.Latest, true))]));
  const out = [];
  // the sides' own code, loaded apart from lane B's loader: each file compiled by TypeScript as a build emits it (its
  // own __decorate helper, untouched; the class-field emit mode its project gives, TypeScript's rule), relative imports inside the root loaded alike, every other import lane B's fake
  // module of that name (the inputs are lane B's draws, so the fakes are the ones the inputs come from)
  const plainLoader = (env, root) => {
    const world = sandbox(env, root), ctx = world.ctx; // lane B's world (its clock, process, timers and fakes, React's hooks and element runtime): the outside both lanes assume
    const cache = new Map();
    const resolve = (from, s) => { const b = path.resolve(path.dirname(from), s); for (const c of [b, b + '.ts', b + '.tsx', b + '.js', path.join(b, 'index.ts')]) if (fs.existsSync(c) && fs.statSync(c).isFile()) return c; return null; };
    const load = (file) => {
      if (cache.has(file)) return cache.get(file).exports;
      const src = fs.readFileSync(file, 'utf8').replace(/\bimport\.meta\.url\b/g, JSON.stringify('file://' + file)).replace(/\bimport\.meta\b/g, '({})'); // CommonJS has no import.meta: the file's own URL, as lane B's loader gives it
      let js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, experimentalDecorators: true, esModuleInterop: true, jsx: ts.JsxEmit.ReactJSX, useDefineForClassFields: fileClassFieldsDefine(file, project) }, fileName: file }).outputText;
      // TypeScript's own helper, run as emitted; a decorator lane B fakes (an outside package's) is run, its result
      // dropped: what it installs is unknown, so the declared member stays (lane B's rule for fakes, SEMANTICS.md)
      js = js.replace(/var __decorate = \(this && this\.__decorate\) \|\| (function \(decorators, target, key, desc\) \{[\s\S]*?\n\});/, (_, helper) => `var __decorate = (function (helper) { return function (decorators) { var rest = Array.prototype.slice.call(arguments, 1); return helper.apply(this, [decorators.map(function (d) { return d && d.__isFake ? function () { try { Reflect.apply(d, this, arguments); } catch (e) { if (!(e && e.__isFake)) throw e; } } : d; })].concat(rest)); }; })(${helper});`);
      const names = []; for (const st of ts.createSourceFile(file, src, ts.ScriptTarget.Latest).statements) if ((ts.isFunctionDeclaration(st) || ts.isClassDeclaration(st)) && st.name) names.push(st.name.text);
      const shim = `\n;module.exports.__lean_units = { ${names.map((n) => `${JSON.stringify(n)}: (typeof ${n} === 'undefined' ? undefined : ${n})`).join(', ')} };`;
      const mod = { exports: {} }; cache.set(file, mod);
      const req = (s) => { if (s.startsWith('.')) { const r = resolve(file, s); if (r && r.startsWith(root) && !r.endsWith('.json')) return load(r); } if (s === 'react') return world.react; if (s === 'react/jsx-runtime' || s === 'react/jsx-dev-runtime') return world.jsxRuntime; return env.module(s); };
      vm.compileFunction(js + shim, ['exports', 'require', 'module', '__filename', '__dirname'], { parsingContext: ctx, filename: file }).call(mod.exports, mod.exports, req, mod, file, path.dirname(file));
      return mod.exports;
    };
    return { ctx, load };
  };
  const timed =async (ctx, fn) => { // a synchronous call under the context's watchdog, an awaited one under a wall bound
    ctx.__routeCall = fn;
    let v; try { v = vm.runInContext('__routeCall()', ctx, { timeout: MS }); } finally { delete ctx.__routeCall; }
    if (v && typeof v.then === 'function') { let t; v = await Promise.race([v, new Promise((_, rej) => { t = setTimeout(() => rej(new Error('__timeout__')), MS); })]).finally(() => clearTimeout(t)); }
    return v;
  };
  for (const [row, want] of Object.entries(exp.b ?? {})) {
    if (want !== 'PASS-bounded') continue;
    let unit = row;
    const held = (u) => inventory.parent.has(u) && inventory.candidate.has(u);
    if (!held(unit) && unit.includes('.')) { const at = unit.lastIndexOf('.'), g = `${unit.slice(0, at)}.get_${unit.slice(at + 1)}`; if (held(g)) unit = g; }
    if (!held(unit)) { out.push({ row, skipped: 'not a unit of both sides (a new unit, a callback, a member of a literal, the module unit)' }); continue; }
    const u = inventory.candidate.get(unit);
    if (u.form === 'callback' || (!u.cls && unit.includes('.'))) { out.push({ row, skipped: `a ${u.form ?? 'literal member'} unit: no call route of its own` }); continue; }
    let plan; try { plan = inputPlan(files.parent, files.candidate, unit, { project, seed: SEED }); } catch (e) { out.push({ row, skipped: `spec: ${String(e.message).slice(0, 120)}` }); continue; }
    const { spec } = plan;
    let ctorSpec = null; if (spec.isMethod) { try { ctorSpec = specOf(files.candidate, `${spec.className}.constructor`, { project }); } catch { ctorSpec = null; } }
    const roots = { parent: findRoot(files.parent), candidate: findRoot(files.candidate) };
    let differs = null, undriven = null, driven = 0, constructorInputs = 0;
    for (let i = 0; i < N && !differs; i++) {
      const obs = {};
      for (const side of ['parent', 'candidate']) {
        const env = new Environment(SEED * 7919 + i); env.shapes = spec;
        let box, ex;
        try { box = plainLoader(env, roots[side]); ex = box.load(files[side]); } catch (e) { obs[side] = { harness: `load: ${String(e.message).slice(0, 120)}` }; continue; }
        await new Promise((r) => setImmediate(r));
        const units = ex.__lean_units ?? {};
        try {
          const inputs = plan.draw(i, env), args = argsFor(spec, inputs);
          const member = spec.member ?? unit.split('.').pop();
          let call, inst = null, built = null;
          if (!spec.isMethod) { const f = units[unit] ?? ex[unit]; call = () => (spec.thisParam ? f.call(args[0], ...args.slice(1)) : f(...args)); }
          else {
            const Cls = units[spec.className] ?? ex[spec.className];
            if (member === 'constructor') call = () => { inst = Reflect.construct(Cls, args); return inst; };
            else if (spec.isStatic) call = () => (spec.accessor === 'get' ? Cls[member] : spec.accessor === 'set' ? ((Cls[member] = args[0]), undefined) : Cls[member](...args));
            else {
              const ctorArgs = ctorSpec ? argsFor(ctorSpec, inputsFor(ctorSpec, SEED, i, env)) : [];
              inst = await timed(box.ctx, () => Reflect.construct(Cls, ctorArgs));
              built = render({ ...inst });
              call = () => (spec.accessor === 'get' ? inst[member] : spec.accessor === 'set' ? ((inst[member] = args[0]), undefined) : inst[member](...args));
            }
          }
          let outcome; try { outcome = { returned: render(await timed(box.ctx, call)) }; } catch (e) { if (e && e.code === 'ERR_SCRIPT_EXECUTION_TIMEOUT' || e?.message === '__timeout__') { obs[side] = { harness: 'timeout' }; continue; } outcome = { threw: render(e) }; }
          obs[side] = { built, outcome, fields: inst ? render({ ...inst }) : null };
        } catch (e) { obs[side] = { harness: `${String(e && e.message).slice(0, 120)}` }; }
      }
      if (obs.parent?.harness || obs.candidate?.harness) { undriven ??= { input: i, why: obs.parent?.harness ?? obs.candidate?.harness }; continue; }
      // the instances differ before the call: the input's difference is the constructor's, which its own unit reports
      // (as programs.mjs reads it); the row of the constructor is checked to be no PASS-bounded below
      if (JSON.stringify(obs.parent.built) !== JSON.stringify(obs.candidate.built)) { constructorInputs++; continue; }
      driven++;
      if (JSON.stringify(obs.parent) !== JSON.stringify(obs.candidate)) differs = { input: i, parent: obs.parent, candidate: obs.candidate };
    }
    const ctorRow = `${spec.className}.constructor`;
    if (constructorInputs && exp.b?.[ctorRow] === 'PASS-bounded' && !differs) differs = { input: `${constructorInputs} input(s)`, parent: `the instances ${ctorRow} built differ`, candidate: `while the row ${ctorRow} is PASS-bounded` };
    out.push({ row, unit, driven, ...(constructorInputs ? { constructorInputs } : {}), ...(differs ? { differs } : {}), ...(undriven && !driven ? { skipped: `no input driven: input ${undriven.input}: ${undriven.why}` } : {}) });
  }
  process.stdout.write(JSON.stringify(out) + '\n');
  process.exit(0);
}

globalThis.__leanLateHooks = true;
const { workerEnv } = await import('../exec/run.mjs'); // each pair's child runs under the environment lane B's worker gets (lean's own reads only)
const only = opt('--pairs', null)?.split(',');
const pairs = fs.readdirSync(pairsDir).sort().filter((p) => (!only || only.includes(p)) && fs.existsSync(path.join(pairsDir, p, 'expect.json')));
let rows = 0, drivenRows = 0, bad = 0; const skipped = [], ctorRows = [];
for (const p of pairs) {
  const exp = JSON.parse(fs.readFileSync(path.join(pairsDir, p, 'expect.json'), 'utf8'));
  if (!Object.values(exp.b ?? {}).includes('PASS-bounded')) continue;
  const r = spawnSync('node', [fileURLToPath(import.meta.url), '--one', path.join(pairsDir, p), '--n', String(N)], { encoding: 'utf8', timeout: 600000, maxBuffer: 1 << 26, env: workerEnv() });
  if (r.stderr) process.stderr.write(r.stderr.split('\n').filter((l) => l && !/ExperimentalWarning|trace-warnings/.test(l)).map((l) => `${p}: ${l}\n`).join(''));
  const line = (r.stdout ?? '').trim().split('\n').pop();
  let res; try { res = JSON.parse(line); } catch { console.log(`${p}: the check did not finish (exit ${r.status}${r.signal ? `, ${r.signal}` : ''})`); skipped.push(`${p}: all rows`); continue; }
  for (const x of res) {
    rows++;
    if (x.skipped) { skipped.push(`${p} ${x.row}: ${x.skipped}`); continue; }
    drivenRows++; if (x.constructorInputs) ctorRows.push(`${p} ${x.row}: ${x.constructorInputs} input(s)`);
    if (x.differs) { bad++; console.log(`PASS-bounded while the sides differ: ${p} ${x.row} on input ${x.differs.input}: parent ${JSON.stringify(x.differs.parent).slice(0, 200)} candidate ${JSON.stringify(x.differs.candidate).slice(0, 200)}`); }
  }
}
for (const s of skipped) console.log(`not driven: ${s}`);
for (const s of ctorRows) console.log(`inputs the constructor's: ${s}`);
console.log(`| LANE-B ROUTES | ${rows} PASS-bounded rows, ${drivenRows} driven on ${N} inputs, ${skipped.length} not driven | ${bad} rows PASS-bounded while the two sides differ on a drawn input |`);
process.exit(bad ? 1 : 0);
