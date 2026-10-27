// usage() on five hand-written units: the property chains read off each parameter and `this`, and the literals they
// are compared against.
//   node --test langs/ts/exec/usage.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { loadProgram, ts } from '../common.mjs';
import { usage, mergeUsage } from './usage.mjs';

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lean-usage-'));
let k = 0;
const of = (src, unit) => { const f = path.join(dir, `u${k++}.ts`); fs.writeFileSync(f, src); const { sf, checker } = loadProgram(f, { project: false }); return usage(sf, unit, checker); };
const at = (n, ...chain) => chain.reduce((x, c) => (c === '[]' ? x.elem : c === 'length' ? x.len : x.fields[c]), n);

test('a dictionary read by literal names through a switch, optional chaining and an alias', () => {
  const u = of(`export function block(node: any, tools?: Map<string, string>) {
    switch (node.type) { case "paragraph": return node.text ?? ""; case "mention": {
      if (node.attrs?.isNotFound === true || node.attrs?.["isActive"] === false) return null;
      const id = node.attrs?.collectionId as string | undefined;
      if (tools && id && tools.has(id)) return tools.get(id);
      return null; } default: return null; } }`, 'block');
  const node = u.params[0].node;
  assert.deepEqual(at(node, 'type').compares, ['paragraph', 'mention']);
  assert.deepEqual(at(node, 'attrs', 'isNotFound').compares, [true]);
  assert.deepEqual(at(node, 'attrs', 'isActive').compares, [false]);
  assert.equal(at(node, 'attrs', 'collectionId').truthy, true); // through the alias `id`
  assert.ok(at(node, 'text'));
  assert.equal(u.params[1].node.truthy, true);
  assert.deepEqual(Object.keys(u.params[1].node.fields), []); // a Map's has/get are no fields
});

test('a string compared against literals behind a `??` default, and a typeof test', () => {
  const u = of(`type Ctx = { provider?: string };
    export function pick(ctx: Ctx, v: unknown) {
      const p = ctx.provider ?? "openai";
      if (p === "gemini") return 1;
      return v !== null && typeof v === "object" ? 2 : 3; }`, 'pick');
  const prov = at(u.params[0].node, 'provider');
  assert.deepEqual(prov.compares, [{ undefined: true }, 'gemini']);
  assert.deepEqual(u.params[1].node.compares, [null]);
  assert.deepEqual(u.params[1].node.typeofs, ['object']);
});

test('a length compared against a module constant, and arithmetic on a field', () => {
  const u = of(`const MAX = 300;
    export function truncate(reason: string, cfg: any) {
      const budget = cfg.thinking.budget + 1;
      return reason.length <= MAX ? reason : reason.slice(0, MAX) + String(budget); }`, 'truncate');
  assert.deepEqual(at(u.params[0].node, 'length').compares, [300]);
  assert.equal(at(u.params[1].node, 'thinking', 'budget').numeric, true);
});

test('array elements read through a callback, a for-of and a literal index; `in` names a field', () => {
  const u = of(`const KEY = { token: "ATTEMPT" } as const;
    export function attempt(build: any) {
      const t = build.env?.vars?.find((v: any) => v.name === KEY.token)?.value;
      for (const s of build.steps) if (s.kind === "x") return s;
      if ("extra" in build) return build.items[0].id;
      return t === undefined ? null : t; }`, 'attempt');
  const b = u.params[0].node;
  assert.equal(at(b, 'env', 'vars').array, true);
  assert.deepEqual(at(b, 'env', 'vars', '[]', 'name').compares, ['ATTEMPT']);
  assert.deepEqual(at(b, 'steps', '[]', 'kind').compares, ['x']);
  assert.ok(at(b, 'extra'));
  assert.ok(at(b, 'items', '[]', 'id'));
});

test('a method: `this` fields, a same-file callee one level down, and the union of two versions', () => {
  const parent = `function isOld(x: any) { return x.age > 30 && deeper(x); }
    function deeper(y: any) { return y.hidden === 1; }
    export class S { limit: any; run(p: any) { if (this.limit.max === 5) return isOld(p); return Math.max(p.n, 0); } }`;
  const candidate = `function isOld(x: any) { return x.age >= 30; }
    export class S { limit: any; run(p: any) { if (this.limit.mode === "on") return isOld(p); return p.n; } }`;
  const a = of(parent, 'S.run'), b = of(candidate, 'S.run');
  assert.deepEqual(at(a.this, 'limit', 'max').compares, [5]);
  assert.deepEqual(at(a.params[0].node, 'age').compares, [30]); // read in the callee
  assert.equal(at(a.params[0].node, 'hidden'), undefined); // two levels down: not read
  assert.equal(at(a.params[0].node, 'n').numeric, true);
  const m = mergeUsage(b, a);
  assert.deepEqual(at(m.this, 'limit', 'max').compares, [5]);
  assert.deepEqual(at(m.this, 'limit', 'mode').compares, ['on']);
  assert.deepEqual(at(m.params[0].node, 'age').compares, [30]);
});

test('a read of `constructor` or `__proto__` is an own field of the tree, never a member of Object.prototype', () => {
  const u = of(`export function tag(x: any, y: any) {
    const c = x.constructor; const q = y.__proto__;
    if (x.kind === "k") return 1;
    return c && q ? 2 : 3; }`, 'tag');
  const ctor = at(u.params[0].node, 'constructor');
  assert.ok(Array.isArray(ctor.compares), 'the constructor read is a usage node');
  assert.deepEqual(at(u.params[0].node, 'kind').compares, ['k']);
  assert.equal(Object.hasOwn(u.params[1].node.fields, '__proto__'), false);
  assert.equal(Object.getPrototypeOf(u.params[1].node.fields), Object.prototype, 'the fields object keeps its prototype');
});

test('a local named as an extra root is read like a parameter, and merges by name', () => {
  const f = path.join(dir, `u${k++}.ts`);
  fs.writeFileSync(f, `export function parse(raw: string) {
    const v: any = JSON.parse(raw);
    if (v.kind === "a" || v.items.length > 2) return 1;
    return 0; }`);
  const { sf, checker } = loadProgram(f, { project: false });
  let v = null; const fn = sf.statements.find((s) => ts.isFunctionDeclaration(s));
  for (const st of fn.body.statements) if (ts.isVariableStatement(st)) for (const d of st.declarationList.declarations) if (d.name.text === 'v') v = d.name;
  const u = usage(sf, 'parse', checker, { roots: [v] });
  assert.equal(u.locals.length, 1);
  assert.equal(u.locals[0].name, 'v');
  assert.deepEqual(at(u.locals[0].node, 'kind').compares, ['a']);
  assert.deepEqual(at(u.locals[0].node, 'items', 'length').compares, [2]);
  const m = mergeUsage(u, u);
  assert.equal(m.locals.length, 1);
  assert.deepEqual(at(m.locals[0].node, 'kind').compares, ['a']);
  assert.equal(usage(sf, 'parse', checker).locals, undefined);
});

test('a key written, assigned or deleted is not a read', () => {
  const u = of(`export function both(d: Record<string, number>, o: any) {
    d["x"] = 1; d.y = 2; delete d.z; o.seen = o.count;
    return 2; }`, 'both');
  assert.deepEqual(Object.keys(u.params[0].node.fields), []);
  assert.deepEqual(Object.keys(u.params[1].node.fields), ['count']);
});

test('a default, in a destructuring or on a parameter, is a comparison against undefined', () => {
  const u = of(`export function sized({ size = 1, ...rest }: any, n = 3) { return [size, rest, n]; }`, 'sized');
  assert.deepEqual(at(u.params[0].node, 'size').compares, [{ undefined: true }, 1]);
  assert.deepEqual(u.params[1].node.compares, [{ undefined: true }]);
});
