// The behavioural fakes (briefs w2-world.md): a specifier (a module, or `global:<name>` for a global the sandbox holds)
// -> its fake, built once per environment. fake.mjs behaviouralFake reads this table; a specifier it does not hold, or
// any specifier under LEAN_FAKES=recording, is answered by the recording proxy, as before the fakes.
import { webGlobals, renderWeb } from './web/index.mjs';

// the globals every environment holds as behavioural fakes, by name
const GLOBAL_SETS = [webGlobals];
export function globalsOf(env) {
  const memo = (env.behaviouralGlobals ??= Object.assign({}, ...GLOBAL_SETS.map((make) => make(env))));
  return memo;
}
export function lookup(env, specifier) {
  if (specifier.startsWith('global:')) { const g = globalsOf(env); const name = specifier.slice(7); return Object.hasOwn(g, name) ? g[name] : null; }
  return null; // module specifiers: none of the web fakes is a module
}
// the rendering of a value a behavioural fake made whose state the generic rendering cannot read, or undefined
export const RENDERERS = [renderWeb];
