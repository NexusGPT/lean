// An element's `children` may be an array, one child, or nothing (patch.mjs header: a tree may be raw, and a rendered
// value past render's depth bound is one object). Every reader takes the same reading (kidsOf): a single object or a
// string child is diffed and printed like a one-element list, never skipped as empty and never a throw. The renderer is
// total: an op whose value cannot be printed falls back to its JSON with a note, so a verdict's report never kills a run.
import assert from 'node:assert/strict';
import { formatOp, witnessPatch, patch, kidsOf } from '../patch.mjs';
import { handlerDifference } from '../exec/handlers-interp.mjs';

const el = (tag, props, children) => ({ $el: tag, props, children });

// the one reading
assert.deepEqual(kidsOf(null), []);
assert.deepEqual(kidsOf(undefined), []);
const arr = ['x']; assert.equal(kidsOf(arr), arr);
assert.deepEqual(kidsOf('t'), ['t']);
assert.deepEqual(kidsOf({ $deep: true }), [{ $deep: true }]);

// a nested node whose children is a single object, and one whose children is a string
const single = (t) => el('div', {}, [el('section', {}, el('span', { id: 's' }, [t]))]);
const text = (t) => el('div', {}, [el('p', {}, t)]);

// formatOp prints each without throwing, the inner child included
const ins = formatOp({ kind: 'insert', path: 'x', before: null, after: single('a') });
assert.match(ins, /<section><span id="s">"a"<\/span><\/section>/, ins);
const rem = formatOp({ kind: 'remove', path: 'y', before: text('hello'), after: null });
assert.match(rem, /<p>"hello"<\/p>/, rem);
const deep = formatOp({ kind: 'insert', path: 'z', before: null, after: el('ul', {}, { $deep: true }) }); // render's depth bound: children cut to one object
assert.match(deep, /^z insert <ul>/, deep);

// witnessPatch reports a difference inside such a child, never "no tree difference"
const w1 = witnessPatch({ tree: single('a') }, { tree: single('b') });
assert.equal(w1.patchSummary, '1 text', JSON.stringify(w1));
assert.equal(w1.patch[0].path, 'div[0]/section[0]/span[0]');
const w2 = witnessPatch({ tree: text('hello') }, { tree: text('world') });
assert.equal(w2.patchSummary, '1 text', JSON.stringify(w2));
assert.equal(w2.patch[0].path, 'div[0]/p[0]');
// the same single child on both sides is no difference; a single child against a one-element list is the same tree
assert.deepEqual(patch(single('a'), single('a')), []);
assert.deepEqual(patch(text('same'), el('div', {}, [el('p', {}, ['same'])])), []);

// a handler difference inside a single-object child is found (handlers-interp reads children the same way)
const fnTree = (d) => el('div', {}, el('button', { onClick: { $fn: 'handler', descriptor: d } }, []));
const hd = handlerDifference(fnTree('[{"return":{"v":1}}]'), fnTree('[{"return":{"v":2}}]'));
assert(hd && hd.prop === '/div[0]/button:onClick', JSON.stringify(hd));

// totality: a value the line printer cannot print (a bigint prop) falls back to its JSON with a note; a cycle is printed
// up to the line's room and stops there
const big = formatOp({ kind: 'insert', path: 'b', before: null, after: el('i', { n: 1n }, []) });
assert.match(big, /^b insert /, big); assert.match(big, /not printed as a tree/, big);
const cyc = el('b', {}, []); cyc.children.push(cyc);
const c = formatOp({ kind: 'remove', path: 'c', before: cyc, after: null });
assert.match(c, /^c remove <b><b><b>/, c);
assert(c.length < 400, c);
console.log('children shape: one reading for arrays, single objects and strings; diffed, printed, handler-compared; the printer is total PASS');
