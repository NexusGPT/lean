// solve/counterexample.mjs, the parts that need no solver (design/w3a-counterexample.md): Dafny's counterexample text
// read into facts, the sequences named by their length alone, the probe, the state after the reads, the model's values
// into JavaScript, and the input by value (encodeValue/decodeValue) round-tripping what the replay hands each side.
//   node --test langs/ts/tests/counterexample.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { initialState, stateAfter, factsOf, unnamedSequences, probeTheorem, parseValue, encodeValue, decodeValue, modelReader, jsOf } from '../solve/counterexample.mjs';

const out = `/tmp/x/theorem.dfy(12,0): Error: a postcondition could not be proved on this return path
 Related counterexample:
 /tmp/x/theorem.dfy(12,0): initial state:
 assume HWorld.HWorld(map[], 2437, false) == hw_ && 7919 == id;
 /tmp/x/theorem.dfy(14,2):
 assume HWorld.HWorld(map[], 2437, false) == hw_ && 7919 == id;
/tmp/x/theorem.dfy(40,0): Error: a postcondition could not be proved on this return path
 Related counterexample:
 /tmp/x/theorem.dfy(40,0): initial state:
 assume 11 == |path| && 'a' == path[0];
`;

test('the initial state of the error inside the lemma, not another lemma', () => {
  assert.equal(initialState(out, [10, 11, 12, 13]).conj, 'HWorld.HWorld(map[], 2437, false) == hw_ && 7919 == id');
  assert.equal(initialState(out, [39, 40]).conj, "11 == |path| && 'a' == path[0]");
  assert.equal(initialState(out, [1, 2]), null);
});

test('facts: a value for a term, either side of ==', () => {
  const f = factsOf(initialState(out, [12]).conj);
  assert.deepEqual(f.eq.get('id'), { k: 'int', v: 7919n });
  assert.equal(f.eq.get('hw_').k, 'ctor');
});

test('a sequence held by its length alone is named, one with every element is not', () => {
  const f = factsOf("11 == |path| && 'a' == path[0] && 2 == |t| && 'x' == t[0] && 'y' == t[1]");
  assert.deepEqual(unnamedSequences(f), [{ term: 'path', n: 11 }]);
});

test('the probe assumes the first state and reads every element after the proof line', () => {
  const text = ['lemma Equal_route(hw_: HWorld, path: string)', '  ensures true', '{ // PROOF Equal_route', '} // END Equal_route'].join('\n');
  const p = probeTheorem(text, 'Equal_route', '2 == |path|', [{ term: 'path', n: 2 }]);
  assert.deepEqual(p.text.split('\n').slice(3, 6), ['  assume {:axiom} 2 == |path|;', '  ghost var cex_0_0 := path[0];', '  ghost var cex_0_1 := path[1];']);
  assert.equal(p.at, 3); assert.equal(p.inserted, 3);
});

test('the elements are read after the reads: the state at the last read line', () => {
  const block = ` /tmp/x/t.dfy(5,0): initial state:
 assume 2 == |s| && '\\U{0008}' == s[0] && '\\U{0004}' == cex_0_0;
 /tmp/x/t.dfy(6,27):
 assume 2 == |s| && 'v' == cex_0_0;
 /tmp/x/t.dfy(7,27):
 assume 2 == |s| && '\\U{0008}' == s[0] && 'v' == cex_0_0 && 'i' == cex_0_1;
`;
  assert.equal(stateAfter(block, 7), "2 == |s| && '\\U{0008}' == s[0] && 'v' == cex_0_0 && 'i' == cex_0_1");
  assert.equal(stateAfter(block, 9), null);
});

test('values: escapes, reals, negatives, constructors', () => {
  assert.deepEqual(parseValue("'\\U{0005}'"), { k: 'char', v: '\u0005' });
  assert.deepEqual(parseValue('(- 3)'), { k: 'int', v: -3n });
  assert.deepEqual(parseValue('1.5'), { k: 'real', num: 15n, den: 10n });
  assert.equal(parseValue('Option.Some(4)').ctor, 'Some');
});

test('a string read element by element, a free part its type\'s first value', () => {
  const text = 'datatype Option<T> = None | Some(value: T)\n';
  const r = modelReader(text, factsOf("2 == |s| && 'o' == s[0] && 'k' == s[1]"));
  assert.equal(jsOf(r.value('s', { k: 'name', name: 'string', args: [], text: 'string' })), 'ok');
  assert.equal(jsOf(r.value('n', { k: 'name', name: 'int', args: [], text: 'int' })), 0);
  assert.equal(jsOf(r.value('o', { k: 'name', name: 'Option', args: [{ k: 'name', name: 'int', args: [], text: 'int' }], text: 'Option<int>' })), undefined);
});

test('the input by value: every value JSON has no word for, shared and cyclic objects, a fresh copy each decode', () => {
  const shared = { n: 1 }; const cyc = { name: 'c' }; cyc.self = cyc;
  const args = [7919n, -0, NaN, undefined, 'admin/debug', [shared, shared], new Map([['k', new Set([1, 2])]]), new Date(5), cyc, null];
  const enc = encodeValue(args);
  const back = decodeValue(JSON.parse(JSON.stringify(enc)));
  assert.equal(back[0], 7919n); assert.ok(Object.is(back[1], -0)); assert.ok(Number.isNaN(back[2])); assert.equal(back[3], undefined);
  assert.equal(back[4], 'admin/debug'); assert.equal(back[5][0], back[5][1]); assert.deepEqual(back[6], new Map([['k', new Set([1, 2])]]));
  assert.equal(back[7].getTime(), 5); assert.equal(back[8].self, back[8]); assert.equal(back[9], null);
  const again = decodeValue(enc); assert.notEqual(again[5][0], back[5][0]); // each side gets its own copy
  assert.equal(Object.getPrototypeOf(back[8]), Object.prototype);
});
