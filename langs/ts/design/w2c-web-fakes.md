# W2c: behavioural fakes for the web platform (2026-11-01)

Lane w2c-web-fakes, workstream W2 (briefs da-v4/w2-world.md). Owns `exec/fakes/web/`, the pairs `fake_fetch`,
`fake_url`, `fake_storage`, and this note. Lane A's reading of these calls is unchanged.

## What

Lane B's sandbox (exec/run.mjs `sandbox`) answered the web platform in three ways before this lane:

- `fetch` was the recording proxy (`env.fake('global:fetch')`): every call recorded with its arguments rendered, the
  response a fake named by the call count (`global:fetch()#1`), its `status` and `ok` lean's varied answer (a fake,
  null, 0, '', false, ...), never a status a server sends;
- `URL`, `URLSearchParams`, `TextEncoder`, `TextDecoder`, `structuredClone` were the host's real classes, but a URL or a
  parameter list has no own fields, so `render` (exec/fake.mjs) showed every one as `{}`;
- `Request`, `Response`, `Headers`, `AbortController`, `AbortSignal`, `DOMException`, `FormData`, `Blob`,
  `localStorage`, `sessionStorage` were absent: a unit that used one threw a ReferenceError, the same on both sides.

Each of the three hides a difference. The pairs measure it (below): a changed URL built as a URL object, a changed
method carried by a Request, a dropped header carried by a Headers object, a status threshold moved across 400, an
abort removed, a storage read of another key, a missing item told from an empty one, a write to another key, a
returned URL or parameter list or Headers changed: every one PASS-bounded under the recording proxy.

The lane adds:

1. **The hook.** `exec/fake.mjs` `behaviouralFake(env, specifier)` answers the behavioural fake for a module specifier
   or for `global:<name>`, or null (the recording proxy answers); `behaviouralGlobals(env)` is every global the fakes
   hold; the sandbox spreads it over its own globals. The registry is `exec/fakes/index.mjs`. `LEAN_FAKES=recording`
   (fake.mjs `BEHAVIOURAL`) turns every behavioural fake off, and the sandbox is then byte for byte what it was:
   this is the `--break` of every pair and test below. (The name was proposed to w2b-node-fakes on the group at the
   lane's start; w2b's wiring had not landed in its tree, so the hook is this lane's minimal one.)
2. **fetch as a table** (`fetch.mjs`). A request is built with the platform's own `Request` (Node's undici, the Fetch
   standard), so a URL object, a Request, a Headers object, a relative URL (Node's TypeError, as Node's own Request and
   fetch raise it: no document to resolve against; w2f), an invalid request (the standard's TypeError) all read as
   Node reads them. The trace
   records `call global:fetch` with the request as the server receives it: method, URL, headers in the standard's
   order, the body text, mode, credentials, cache, redirect. The answer is a row of a table keyed by
   (method, url, body): drawn on first use from the input's seed and the key only, the same row ever after. A row is
   a status (`STATUSES`, rotated by the seed: `(seed + h(key)) mod 14`), the standard's status text, a content type,
   and a body: `json()` resolves to lean's varied answer at the row's path (`response:<hash>.json()`, a fake or a plain
   edge: what the recording proxy answered, now named by the request rather than the call count), `text()` to a drawn
   text (one of the unit's own strings, the empty text, a JSON text of each kind). A null-body status (204) answers
   `''` and a `json()` that rejects with the engine's SyntaxError. A body is read once (the standard's TypeError
   after). An aborted signal rejects with its reason. On the world's fault draw (fake.mjs `faultDraw`, one call in
   twelve, per request and per repetition) the network fails: a rejected TypeError, as before for any call.
3. **The platform's classes, real** (`fetch.mjs`, `headers.mjs`, `url.mjs`, `encoding.mjs`, `clone.mjs`): `Request` and
   `Response` subclass the host's only to remember the body they were built with (the standard keeps it in a stream,
   readable only asynchronously); `Response.json` is the standard's static. `Headers`, `FormData`, `Blob`, `URL`,
   `URLSearchParams`, `TextEncoder`, `TextDecoder`, `structuredClone`, `DOMException` are the host's unchanged.
4. **AbortSignal.timeout on the virtual clock** (`abort.mjs`): the signal aborts with the standard's TimeoutError when
   the virtual clock reaches its due instant, armed by `env.arm` beside the unit's own timers; `AbortController` is the
   host's.
5. **localStorage and sessionStorage as a record** (`storage.mjs`). The store before the run is a fact of the world,
   drawn once per input and area: each of the unit's own strings (spec.mjs, where a storage key the unit names stands)
   is present on about half the inputs, holding a drawn text. From there the store is the HTML standard's Storage:
   setItem stores the text of its value, getItem answers it or null, removeItem, clear, `length`, `key(i)`, and the
   named-property forms (`localStorage.x`, `localStorage.x = v`, `delete localStorage.x`, `Object.keys`, `in`). Every
   write is recorded on the trace (`call global:localStorage.setItem [k, v]`, in order); a read is not a request.
6. **Rendering by the standard's state** (`fake.mjs renderBody`, `web/index.mjs renderWeb`): a URL by its href, a
   parameter list by its serialisation, Headers by their entries, a Request by its shape, a Response by status, status
   text, URL, headers, body and bodyUsed, an AbortController or AbortSignal by aborted and reason, a DOMException by
   its name (AbortError, TimeoutError; the message is the engine's), a Storage by its items.

## Why this is the structural fix

The defect is one invariant broken three ways: *what lane B observes of a value is what the platform defines that value
to be*. A URL is its href (WHATWG URL: the serialisation is the URL); a Headers object is its header list; a Response
is its status, headers and body; a request is what the server receives. The recording proxy observed none of these:
it showed slot-state objects as `{}`, threw on classes the platform has, and answered a response's status from a
distribution no server has. No pair, input or name is special-cased: every rendering rule is "the state the standard
defines", every class is the standard's own code, and every answer of the world is drawn by (seed, the question's own
key), the rule fake.mjs already follows for typed answers (`typed`: seeded by seed and path).

## The argument it is sound

A WITNESS stands on two runs of one input in which the two sides were handed the same world and observed different
things. The fakes keep both halves:

- *Same world on both sides.* Every draw depends on `env.seed` and on the question's key only (draw.mjs: the request
  key, the storage area and key; the fault draw on the request key and its repetition count). Both sides of an input
  have the same seed, so the same question answers the same; a question asked in another order answers the same
  (protocol test "the same request answers the same row on both sides, in any order").
- *A difference observed is a difference of the unit.* The trace shows only requests (a fetch, a storage write); the
  outcome shows values by the state the standard defines. A refactor that makes the same requests and computes the
  same values is PASS (pairs: `created`, the same request through a Request object; `twice`, either answer of a
  repeated request; `sorted`, `bytes`, `logout`, `visits`), where the recording proxy reported two of them as WITNESS
  (`created`: Request absent on one side; `twice`: answers named by call count).

What a PASS-bounded under the fakes assumes, stated (subset.md, the paragraph after the world-transition table):
two identical requests in one run get one answer (the server is a function of the request, its headers not read);
a response arrives in the turn it was asked (an abort after the call does not cancel it; `AbortSignal.timeout`
fires only through the virtual clock); a storage key the unit does not name as a string literal starts absent. A
unit whose behaviour rests on a server that answers the same request differently, on header-dependent responses, or
on network latency is bounded only within this world, as every lane B verdict is bounded by its world.

The `--break` keeps the claim honest: `LEAN_FAKES=recording` removes every mechanism above, and each pair states the
verdict it gets then (`bUnder` in expect.json); every protocol test fails then (`web-fakes` suite row: all pass with
the fakes, none without).

## Tests, red first

- `tests/pairs/fake_fetch`: users (changed URL via a URL object), remove (changed method via a Request), profile
  (dropped header via Headers), failed (`>= 400` against `> 400`), cancelled (abort removed): WITNESS under the fakes,
  PASS-bounded under `LEAN_FAKES=recording`. created, twice: PASS-bounded under the fakes, WITNESS under recording.
- `tests/pairs/fake_url`: link, query, accept: WITNESS / PASS-bounded under recording. sorted, bytes: PASS-bounded under both.
- `tests/pairs/fake_storage`: theme (reads another key than it wrote), language (`??` against `||` over a stored empty
  text), save (writes another key): WITNESS / PASS-bounded under recording. logout, visits: PASS-bounded under both.
- `exec/fakes/web/web.test.mjs`, suite row `web-fakes`: 12 protocol tests (fetch keyed by request, order-free; a
  Request and a fetch of the same parts one request; every status within 14 inputs, ok iff 2xx; the trace's request
  shape; relative URL and invalid request; body read once, 204; abort and fault; the virtual-clock timeout; storage
  write-then-read, remove, same world per seed, presence on some inputs, writes on the trace and reads not; platform
  objects rendered by state). 12 pass; under `LEAN_FAKES=recording` 0 pass, 12 fail.
- `tests/run.mjs` reads a new expect.json key, `bUnder`: `{ "K=V": { unit: verdict } }`, lane B run with those
  variables set.

## The measurement

See `lane/w2c-web-fakes-result.md` for every number and its command. On real code (three census roots, copied to
scratch: the units whose own text names a web global the fakes answer), each unit's self-pair and three planted
changes (exec/mutate.mjs) run with the fakes and under the recording proxy.

On nutshell (30 units, 87 planted changes): the fakes detect 59 (67.8%), the recording proxy 46 (52.9%); 13 are found
only with the fakes and none only by the recording proxy; the 30 self-pairs give no WITNESS in either mode. The 13 are
AbortController-based code (absent before: both sides threw one ReferenceError) and changed fetch options. pyka and
nexus-learning were not measured: the machine's load stayed above the start cap for the lane's window.

## What is open

- `json()` and `text()` of one fetched response are not consistent (`JSON.parse(await r.text())` is a drawn text, `await
  r.json()` a fake): a refactor between the two is a WITNESS under both modes (it was one under the recording proxy too).
- No module fakes: `node-fetch`, `cross-fetch`, `undici` imports stay recording fakes (w2d: axios as fetch).
- `structuredClone` of a recording fake throws DataCloneError on both sides (a fake is a function object to the algorithm).
- A response's latency is not modelled: a race between a fetch and a timer is decided in the fetch's favour.
- Inputs: a string parameter handed to `new URL(x)` with no base never meets a valid absolute URL (gen.mjs draws no
  scheme and host), so such a unit throws on every input on both sides (W3: witness search).
- The lint's EFFECT_GLOBALS and lane A's world transitions for these calls are untouched; no admission site added, so the
  audit table (design/admission-contract.md) has no new row.
