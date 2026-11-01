// patch() on hand-built element trees, the shapes lane B produces (exec/run.mjs): raw and rendered, keyed and not.
//   node --test langs/ts/patch.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { patch, witnessPatch, summarize, formatOp } from './patch.mjs';
import { render } from './exec/fake.mjs';

const el = (tag, props = {}, ...children) => ({ $el: tag, props, children });
const li = (key, text) => el('li', { key }, text);
const kinds = (ops) => ops.map((o) => o.kind);

test('identical trees give no ops', () => {
  assert.deepEqual(patch(el('div', { id: 'x' }, 'a', el('b', {}, 'c')), el('div', { id: 'x' }, 'a', el('b', {}, 'c'))), []);
});

test('a keyed insert, a keyed remove', () => {
  const ins = patch(el('ul', {}, li('a', 'A')), el('ul', {}, li('a', 'A'), li('b', 'B')));
  assert.deepEqual(kinds(ins), ['insert']); assert.equal(ins[0].path, 'ul[1]'); assert.equal(ins[0].key, 'b');
  const rem = patch(el('ul', {}, li('a', 'A'), li('b', 'B')), el('ul', {}, li('b', 'B')));
  assert.deepEqual(kinds(rem), ['remove']); assert.equal(rem[0].path, 'ul[0]'); assert.equal(rem[0].key, 'a');
});

test('an insert before kept keys is not a move', () => {
  const ops = patch(el('ul', {}, li('a', 'A'), li('b', 'B')), el('ul', {}, li('z', 'Z'), li('a', 'A'), li('b', 'B')));
  assert.deepEqual(kinds(ops), ['insert']);
});

test('a reordered keyed list is one move per key out of order', () => {
  const ops = patch(el('ol', {}, li('a', '1'), li('b', '2'), li('c', '3')), el('ol', {}, li('c', '3'), li('a', '1'), li('b', '2')));
  assert.deepEqual(kinds(ops), ['move']); assert.equal(ops[0].key, 'c'); assert.equal(ops[0].before, 2); assert.equal(ops[0].after, 0);
});

test('unkeyed children are matched by position: a text change and an appended node', () => {
  const ops = patch(el('p', {}, 'Hello'), el('p', {}, 'Hi', el('b', {}, '!')));
  assert.deepEqual(kinds(ops), ['text', 'insert']); assert.equal(ops[0].path, 'p[0]'); assert.equal(ops[1].path, 'p[1]');
});

test('a changed tag at one position is a remove and an insert', () => {
  assert.deepEqual(kinds(patch(el('div', {}, el('span', {}, 'x')), el('div', {}, el('em', {}, 'x')))), ['remove', 'insert']);
});

test('attributes: changed, added, removed; a function prop is compared as fn', () => {
  const f = () => 1, g = () => 2;
  const ops = patch(el('a', { href: '/x', onClick: f, title: 't' }, 'x'), el('a', { href: '/y', onClick: g, rel: 'r' }, 'x'));
  assert.deepEqual(ops.map((o) => [o.kind, o.name]), [['attribute', 'href'], ['attribute', 'rel'], ['attribute', 'title']]);
  assert.deepEqual(ops[1].before, render(undefined));
  const rendered = patch(el('a', { onClick: { $handler: { returned: 1 } } }), el('a', { onClick: { $handler: { returned: 2 } } }));
  assert.deepEqual(rendered, []);
  assert.deepEqual(kinds(patch(el('a', { onClick: f }), el('a', {}))), ['attribute']);
});

test('component tags, fragments and fakes keep the handler labels', () => {
  const C = { $component: 'Card' };
  const ops = patch(el(C, {}, el('', {}, 'a')), el(C, {}, el('', {}, 'b')));
  assert.equal(ops[0].path, 'C[0]/[0]');
  const fakeChild = { $fake: 'props.icon' };
  assert.deepEqual(patch(el('i', {}, fakeChild), el('i', {}, fakeChild)), []);
  const ch = patch(el('i', {}, fakeChild), el('i', {}, { $fake: 'props.other' }));
  assert.deepEqual(kinds(ch), ['remove', 'insert']); assert.equal(formatOp(ch[0]), 'i[0] remove props.icon');
});

test('array roots, a root rendering nothing, and a deep child tree', () => {
  assert.deepEqual(kinds(patch([el('a', {}), el('b', {})], [el('a', {})])), ['remove']);
  const appear = patch(null, el('p', {}, 'x')); assert.deepEqual(kinds(appear), ['insert']); assert.equal(appear[0].path, '[0]');
  const deep = patch({ ...el({ $component: 'Child' }, { text: 'x' }), rendered: el('span', {}, 'hello') }, { ...el({ $component: 'Child' }, { text: 'x' }), rendered: el('span', {}, 'bye') });
  assert.deepEqual(kinds(deep), ['text']); assert.equal(deep[0].path, 'rendered/span[0]');
});

test('a value that is not a tree gives no ops and a reason, never a throw', () => {
  for (const [a, b] of [[{ threw: 1 }, el('p', {})], [el('p', {}), 42n], ['text', 'text'], [undefined, null]]) {
    const ops = patch(a, b); assert.deepEqual([...ops], []); assert.equal(typeof ops.reason, 'string');
  }
  const cyc = el('p', {}); cyc.props.self = cyc;
  assert.ok(Array.isArray(patch(cyc, el('p', {}))));
});

test('witnessPatch: one-render, sequence and finite observations, and an empty patch that says why', () => {
  const obs = (tree, trace) => ({ outcome: { returned: tree }, heap: {}, receiver: {}, trace, pending: [] });
  assert.equal(witnessPatch(obs(el('p', {}, 'a'), []), obs(el('p', {}, 'b'), [])).patchSummary, '1 text');
  const same = witnessPatch(obs(el('p', {}, 'a'), [{ op: 'call', args: ['x'] }]), obs(el('p', {}, 'a'), [{ op: 'call', args: ['y'] }]));
  assert.deepEqual(same, { patch: [], patchSummary: 'no tree difference; the trace differs' });
  const step = (tree, pending) => ({ command: 'b:onClick', tree, trace: [], pending });
  assert.equal(witnessPatch(step(el('b', {}), []), step(el('b', {}), [{ op: 'setTimeout' }])).patchSummary, 'no tree difference; the pending work differs');
  assert.equal(witnessPatch({ command: 'unmount', trace: [1] }, { command: 'unmount', trace: [2] }).patchSummary, 'no patch: no tree at the unmount step');
  assert.equal(witnessPatch({ command: 'x', threw: 'e', trace: [] }, step(el('b', {}), [])).patchSummary, 'no patch: the parent threw');
  assert.equal(witnessPatch(el('b', {}, '1'), el('b', {}, '2')).patchSummary, '1 text');
  assert.equal(witnessPatch(el('b', { onClick: { $handler: { returned: 1 } } }), el('b', { onClick: { $handler: { returned: 2 } } })).patchSummary, "no element difference; a handler's observed result differs");
  assert.equal(witnessPatch(el('b', {}), el('b', {}), 'the handler sets differ').patchSummary, 'no tree difference; the handler sets differ');
});

test('summary counts per kind in a fixed order; formatOp puts the path first', () => {
  assert.equal(summarize([{ kind: 'text' }, { kind: 'remove' }, { kind: 'text' }]), '1 remove, 2 text');
  assert.equal(formatOp({ kind: 'attribute', path: '', name: 'href', before: '/a', after: '/b' }), '(root) attribute href: "/a" to "/b"');
  assert.equal(formatOp({ kind: 'insert', path: 'ul[1]', after: render(li('b', 'B')) }), 'ul[1] insert <li key="b">"B"</li>');
});
