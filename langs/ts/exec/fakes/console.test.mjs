// The console fake's protocol (design/w2b-node-fakes.md): every call is on the trace with its arguments (the captured
// log) and answers undefined, as Node's console; it never faults. `--break`: the recording proxy alone answers.
import test from 'node:test';
import assert from 'node:assert/strict';
import { Environment } from '../fake.mjs';
import { moduleOf } from './protocol.mjs';

test('captured log: the call and its arguments on the trace, undefined answered, no drawn fault', () => {
  for (let seed = 1; seed <= 40; seed++) { // the faults are not turned off here: a log line is no request that can fail
    const env = new Environment(seed); const c = moduleOf(env, 'console');
    assert.equal(c.log('a', 1), undefined); assert.equal(c.error('b'), undefined);
    assert.deepEqual(env.trace.filter((r) => r.op === 'call').map((r) => [r.path, r.args]), [['module:console.log', ['a', 1]], ['module:console.error', ['b']]]);
  }
});
