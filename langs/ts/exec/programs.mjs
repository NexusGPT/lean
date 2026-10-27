// Lane B, retained state (research 14 design (a)): a class is a unit of state, and a program of method calls on ONE
// instance per side can show a difference no single call shows. For a class unit, P seeded programs of 1..L commands
// run on an instance built by the class's own constructor (its arguments drawn like a unit's); after every command the
// two sides' observations (outcome, the instance's fields, the trace, the reachable graph) are compared; the first
// divergence is shrunk by deleting commands while a divergence stays, and the shrunk program is the WITNESS. A clean
// run is PASS-bounded with the program and command counts in the certificate (bound.programs).
import { Environment, render, makeRng } from './fake.mjs';
import { specOf } from './spec.mjs';
import { inputsFor } from './gen.mjs';
import { loadProgram, topLevelFunctions } from '../common.mjs';
import { exploreRaces, hiddenStateOf } from './program.mjs';

export async function runPrograms({ files, roots, spec, seed, ms, rt, project, programs = 12, maxLen = 5 }) {
  const className = spec.className;
  const members = spec.receiver?.members ?? {};
  const methodNames = Object.entries(members).filter(([, m]) => m.kind === 'method').map(([n]) => n);
  if (!className || !methodNames.length) return null;
  // the command alphabet of a unit: the unit itself and the methods whose text is the same on both sides, so a
  // divergence in a program is the unit's own; a method that changed too is checked by its own run
  const member = spec.member ?? spec.unit.split('.')[1];
  const fold = (u) => (u ? u.fn.getText().replace(/\s+/g, ' ') : null);
  const texts = {};
  for (const name of ['parent', 'candidate']) { try { const { sf } = loadProgram(files[name], { project }); const fns = topLevelFunctions(sf); texts[name] = Object.fromEntries(methodNames.map((m) => [m, fold(fns.get(`${className}.${m}`))])); } catch { texts[name] = {}; } }
  const same = (m) => m === member || (texts.parent[m] && texts.parent[m] === texts.candidate[m]);
  // the instance both programs start from is the constructor's work: when the constructor changed, every program
  // diverges at its first command for the constructor's reason, which the constructor's own unit reports
  if (texts.parent.constructor !== undefined || texts.candidate.constructor !== undefined) { /* a member named constructor is never a method here */ }
  const ctorText = (name) => { try { const { sf } = loadProgram(files[name], { project }); return fold(topLevelFunctions(sf).get(`${className}.constructor`)); } catch { return null; } };
  if (ctorText('parent') !== ctorText('candidate')) return { verdict: 'PASS-bounded', programs: 0, commands: 0, methods: [], skipped: 'the constructor changed, so the instances differ before any command; its own unit reports it' };
  const specs = {};
  for (const m of methodNames) { if (!same(m)) continue; try { const s = specOf(files.candidate, `${className}.${m}`, { project }); if (!s.isStatic && !s.accessor) specs[m] = s; } catch { /* a member without a unit of its own (inherited, overloaded) is not a command */ } }
  const cmds = Object.keys(specs).sort();
  if (!cmds.length) return null;
  let ctorSpec = null; try { ctorSpec = specOf(files.candidate, `${className}.constructor`, { project }); } catch { ctorSpec = null; }
  const draw = (p) => { const rng = makeRng(seed * 7907 + p * 13 + 1); const len = 1 + Math.floor(rng() * maxLen); return Array.from({ length: len }, (_, k) => ({ method: k === len - 1 || !cmds.includes(member) ? (cmds.includes(member) ? member : cmds[Math.floor(rng() * cmds.length)]) : cmds[Math.floor(rng() * cmds.length)], index: p * 101 + k })); }; // the last command is the unit's own
  const run = async (program) => {
    const sides = {};
    for (const name of ['parent', 'candidate']) {
      const env = new Environment(seed * 7919 + 4242); env.shapes = spec;
      let exportsObj;
      try { exportsObj = rt.sandbox(env, roots[name]).load(files[name]); } catch (e) { return { harness: `${name}: load failed: ${String(e && e.message).slice(0, 160)}` }; }
      const Cls = (exportsObj.__lean_units ?? {})[className] ?? exportsObj[className];
      if (typeof Cls !== 'function') return { harness: `${name}: class ${className} not exported` };
      let inst = null;
      if (ctorSpec) { const args = inputsFor(ctorSpec, seed, 0, env); try { inst = rt.guardedCall(env, () => Reflect.construct(Cls, args), ms); } catch (e) { return { harness: `${name}: constructor threw ${String(e && e.message).slice(0, 120)}` }; } }
      if (!inst) return { harness: `${name}: no constructor unit to build an instance` };
      await new Promise((r) => setImmediate(r));
      env.trace.length = 0; env.pending.length = 0; env.calls.clear(); // what the constructor did is the program's starting state, not a command
      sides[name] = { env, Cls, inst };
    }
    const steps = [];
    for (let k = 0; k < program.length; k++) {
      const c = program[k]; const obs = {};
      for (const name of ['parent', 'candidate']) {
        const s = sides[name]; const args = inputsFor(specs[c.method], seed, c.index, s.env);
        const method = s.Cls.prototype[c.method];
        if (typeof method !== 'function') return { harness: `${name}: ${c.method} is not a method` };
        const side = { env: s.env, unit: { call: (a) => method.apply(s.inst, a), receiver: { __own: () => ({ ...s.inst }) } } };
        obs[name] = await rt.observe(side, specs[c.method], args, ms);
        obs[`${name}Args`] = args.map((a) => render(a));
      }
      if (obs.parent.harness || obs.candidate.harness) return { harness: `command ${k} (${c.method}): ${obs.parent.harness ? 'parent ' + obs.parent.harness : 'candidate ' + obs.candidate.harness}` };
      steps.push({ method: c.method, args: obs.parentArgs });
      if (JSON.stringify(obs.parent) !== JSON.stringify(obs.candidate)) return { diverged: k, steps, parent: obs.parent, candidate: obs.candidate, where: rt.firstDifference(obs.parent, obs.candidate) };
    }
    return { steps };
  };
  let commands = 0, ran = 0;
  for (let p = 0; p < programs; p++) {
    let program = draw(p); ran++; commands += program.length;
    const r = await run(program);
    if (r.harness) return { verdict: 'ASK', reason: `program ${p}: ${r.harness}`, programs: ran, commands, methods: cmds };
    if (r.diverged === undefined) continue;
    program = program.slice(0, r.diverged + 1); let last = r; // the divergence and what led to it
    for (let i = program.length - 2; i >= 0; i--) { const trial = program.filter((_, j) => j !== i); const t = await run(trial); if (t.diverged !== undefined) { program = trial; last = t; } } // greedy deletion: a command whose removal keeps a divergence was not needed
    return { verdict: 'WITNESS', program: last.steps, divergence: { command: last.diverged, method: last.steps[last.diverged].method, where: last.where, parent: last.parent, candidate: last.candidate }, seed, programIndex: p, programs: ran, commands, methods: cmds };
  }
  return { verdict: 'PASS-bounded', programs: ran, commands, methods: cmds };
}

// Races on retained state (design/schedules.md): two calls of an async method on ONE instance per side, the second
// arriving while the first is pending, under the conflict-bounded order set of program.mjs. The instance is the
// class's own construction; a field read or write goes through a proxy that names the cell for the dependency relation.
export async function runClassRaces({ files, roots, spec, seed, ms, rt, project }) {
  const className = spec.className, member = spec.member ?? spec.unit.split('.')[1];
  if (!spec.isAsync || !className || spec.isStatic || spec.accessor || member === 'constructor') return null;
  const hidden = hiddenStateOf(files.parent, project) ?? hiddenStateOf(files.candidate, project);
  if (hidden === 'private') return { verdict: 'PASS-bounded', stats: null, skipped: 'a private name (#field): the receiver cannot be observed through a proxy' };
  const fold = (u) => (u ? u.fn.getText().replace(/\s+/g, ' ') : null);
  const ctorText = (name) => { try { const { sf } = loadProgram(files[name], { project }); return fold(topLevelFunctions(sf).get(`${className}.constructor`)); } catch { return null; } };
  if (ctorText('parent') !== ctorText('candidate')) return { verdict: 'PASS-bounded', stats: null, skipped: 'the constructor changed, so the instances differ before any call; its own unit reports it' };
  let ctorSpec = null; try { ctorSpec = specOf(files.candidate, `${className}.constructor`, { project }); } catch { ctorSpec = null; }
  const mount = async (name, p) => {
    const env = new Environment(seed * 7919 + 5151 + p); env.shapes = spec;
    const exportsObj = rt.sandbox(env, roots[name]).load(files[name]);
    const Cls = (exportsObj.__lean_units ?? {})[className] ?? exportsObj[className];
    if (typeof Cls !== 'function') throw new Error(`${name}: class ${className} not exported`);
    const inst = rt.guardedCall(env, () => Reflect.construct(Cls, ctorSpec ? inputsFor(ctorSpec, seed, 0, env) : []), ms);
    await new Promise((r) => setImmediate(r));
    env.trace.length = 0; env.pending.length = 0; env.calls.clear(); // what the constructor did is the starting state
    const method = Cls.prototype[member];
    if (typeof method !== 'function') throw new Error(`${name}: ${member} is not a method`);
    const owned = (t, k) => typeof k === 'string' && Object.prototype.hasOwnProperty.call(t, k);
    const self = new Proxy(inst, { // a field holding an object escapes to its reader: whoever holds it may change it later
      get(t, k, r) { if (owned(t, k)) { const v = t[k]; env.access?.(`this.${k}`, v !== null && (typeof v === 'object' || typeof v === 'function') && !v.__isFake ? 'object' : 'r'); } return Reflect.get(t, k, r); },
      set(t, k, v) { if (typeof k === 'string') env.access?.(`this.${k}`, 'w'); return Reflect.set(t, k, v); },
    });
    const args = [inputsFor(spec, seed, p, env), inputsFor(spec, seed, p, env)];
    return { env, start: [() => method.apply(self, args[0]), () => method.apply(self, args[1])], own: () => ({ ...inst }) };
  };
  return exploreRaces({ mount, seed, ms, rt, hidden });
}
