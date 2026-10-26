# Clock reads
A clock observes an outside instant at the point the expression executes.
JavaScript `new Date()` reads wall time; `Date.now()` returns epoch milliseconds.
`new Date(x)` converts its supplied value and makes no clock request.
`performance.now()` reads a monotonic relative time; `process.hrtime()` returns
seconds and nanoseconds, optionally relative to its supplied earlier tuple.

## Before, at 03ec3bc

The lint already admits Date and process. The translator already marks no-argument
Date construction and Date.now as world transitions. Fixed Date construction is
pure and uninterpreted. Date methods, including getTime, are generic method
transitions; their numeric results use the existing arithmetic reading.
process.hrtime already takes the generic outside-call path. performance.now can
be refused as global-read because performance is absent from EFFECT_WORLD.
The subset table already documents Date.now, new Date and getTime transitions.
Lane B supplies the same unrecorded constant for every Date clock read;
performance and process are generic proxies, without native numeric/tuple answers.

## Reading
The existing proof interpretation is retained. A bodiless function takes the world
and arguments and returns the next world with its answer. Clock methods have an
explicit effect classification alongside the existing constructor rule.
The lint admits performance as an outside global. No special clock axiom is added.
For example, the generated real-valued once unit contains:

```dafny
var (wld, t0_) := ext_call_args_Date_now_World(wld);
var now: real := t0_;
(wld, now + n)
```

A different count, operation, argument or position relative to a port need not
produce the same world. Identical ordered requests can prove equal. Fixed Date
construction has no World parameter. getTime is deliberately left on its existing
conservative transition path, as requested; subsequent arithmetic is numeric.
The numeric opaque reading retains source and dependencies for variable divisors
and high-resolution clock observers in integer files. Fractional performance.now
values cannot satisfy the integer identity n === Math.floor(n); aliases and
same-file callers inherit opacity. Real files retain ordered clock transitions.
No numeric refusal is added and Date objects are not replaced with integers.

## Bounded execution
The environment records each Date, Date.now, performance.now and process.hrtime
request alongside port requests. Instants advance using a separate seeded stream.
Both versions see the same sequence under the same seed. Date construction with
arguments, parse and UTC retain native value behaviour. Date subclasses retain
newTarget. Calling Date as a function also records its clock read.
performance returns a number, hrtime returns a normalized tuple, and hrtime.bigint
returns a bigint. The bounded schedule samples positive advances and fractional performance values;
it does not cover every real clock resolution or wall-clock adjustment.
Seed replay, changed seeds, native shapes, fixed conversions and subclasses have
direct runtime checks. Pair tests expose both extra reads and port reordering.

## Soundness and remaining boundaries
Clock values are never shared as a timeless constant in the proof. Uninterpreted
transitions make order changes unprovable even when a sampled result coincides.
The fake trace catches an extra read even when the return value ignores it.
Recognizing built-in methods checks global origin; local objects retain their
existing method reading. No method, alias or Date mutation gains a new purity claim.
Effectful module let initializers remain refused by toplevel-effect; the
clock_initializer escape exercises performance.now there. Other unrelated lint
boundaries, including reference identity, remain in force.

## Real instances inspected
Paths below are relative to the census repository or named bench export tree.
- ftp-server-orange/src/store.ts:132: markTokenUsed reads new Date; enters.
- nexus-learning/packages/core/src/notifications/inbox.ts:102: groupOf converts
  an explicit timestamp; enters the existing value-conversion reading.
- blocks/apps/api/src/infrastructure/persistence/ProjectRepository.ts:10:
  toDate converts its argument; enters the value-conversion reading.
- apps-ui/src/record-core/views/calendar/events.ts:47: parseDay converts a string
  and inspects getTime; enters the existing conservative method reading.
- nexus/apps/backend/src/_common/streaming/resumable-stream-buffer.service.ts:219:
  evictStaleBuffers reads Date.now; enters, inspected in the bench export.
- promo-app/src/ui/format.ts:74: daysLeft combines fixed Date and Date.now;
  enters, inspected in the bench export.

The census domain new Date includes argument conversions as well as clock reads.
Validation outputs and exact benchmark counts are in clock-read-validation.txt.
