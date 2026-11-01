# W2f: the fake conformance's seven BAD rows fixed (2026-11-01)

Branch `lane/w2f-fake-conformance-fixes`, cut from `lead-v4` at bd48de0be5. Not pushed.

`node langs/ts/conformance/fakes.mjs` at bd48de0b: 36 fakes, 29 pass, 7 BAD (seed 1). Now: 0 BAD at seeds 1 to 5. Seeds
2 to 5 at the first five commits showed three more BAD rows (fs agree, fs/promises agree, Request agree). Two of them
came from the conformance harness and one from the Request fake. The lead decided all three (A, B, C below).

Every fix applies the real module's rule (Node 24.22.2 on Linux, observed with a probe), never a case of the drawn
script.

## The defects, the rule, the change

| # | row | the real module's rule | where the fake broke it | change (commit) |
| --- | --- | --- | --- | --- |
| 1 | `node:fs` agree: `promises.stat("<R>/a/x")`, `<R>/a` a file: ENOENT, Node ENOTDIR | path resolution walks the folders on the way from the root before the operation looks at the last component. The first one that is not a folder decides: ENOENT if it is absent, ENOTDIR if it is a file | the fake looked up the whole path and answered ENOENT for any miss | `fs.mjs`: one path walk for every operation, then the operation's own rule (c92e905032). From the probe: mkdir recursive on a file EEXIST, `throwIfNoEntry: false` also forgives ENOTDIR, rm's lstat, rename(2)'s EINVAL/ENOTEMPTY/EISDIR/ENOTDIR, copyFile onto a folder EISDIR, writeFile `wx` EEXIST. `rmSync({recursive, force})` under a file returns, while `fs.rm` rejects ENOTDIR; rename walks both parents first (41d9666c28) |
| 2 | `node:fs/promises` agree: `mkdir("<R>/d", {recursive})` on an existing path ENOTDIR, Node EEXIST; `stat("<R>/d/f/g")` ENOENT, Node ENOTDIR | the same walk; `mkdir -p` on an existing file is EEXIST, on an existing folder it returns undefined | the same code (the promise forms share it) | the same commits |
| 3 | `node:url` agree: `pathToFileURL('/C:\\xü//')` drops the trailing `/` | Node's `pathToFileURL` resolves the path and then puts back a trailing separator that `path.resolve` stripped (lib/internal/url.js) | the fake returned `path.resolve`'s result as it was | `url.mjs` (4f9a7cc053) |
| 4a | `node:timers` delay coercion: `setTimeout(c0, 1); setTimeout(c1, 0)` fired c1 first | lib/internal/timers.js: `after *= 1`; a delay that is not in [1, 2^31-1] becomes 1 | the fake armed a 0 ms delay as 0 | `timers.mjs`: Node's rule, in timers and timers/promises (81123a3a83) |
| 4b | `node:timers` virtual order: `interval t1 2K x1` fired five times, Node once | an interval cleared inside its own callback does not fire again | the virtual clock (`exec/run.mjs` runTimers) took the firing entry off the queue while its callback ran. `clearInterval` of its own id then found nothing, was recorded as a request to the world, and the interval was re-armed. This is w2e's clock defect, in the clock itself | `clearTimer` now reaches the firing entry and marks it cleared, and runTimers does not re-arm a cleared interval (81123a3a83) |
| 5 | `global:Response` agree: `Response.json(undefined, {status: 201})` resolved | Fetch `Response.json`: serialise to JSON. A value with no JSON text (undefined, a function, a symbol) is undici's TypeError 'Value is not JSON serializable' | the fake built a response with an empty body | `web/fetch.mjs` Response.json (d9ffb5c3b2) |
| 6 | `global:fetch` json is the parse of text: `text()` "{}" while `json()` returned a recording handle | a Response has one body: `json()` is `JSON.parse` of the same bytes `text()` reads | `json()` on a fetched response was the recording proxy's member | `json()` is the standard's own over the drawn text, so a text that is no JSON rejects with SyntaxError, as on a real Response (d9ffb5c3b2). web.test: a new test holds `json()` to the parse of `text()` |
| 7 | `vscode` (lib hook) no runnable clause | no oracle: the vscode API exists only inside an editor's extension host, and none runs on this machine to record vectors from | the model certified itself (only its own contract tests) | decision C, below |

### A. fsWorld (the conformance harness), the lead's decision A

Seeds 2 to 5 failed fs agree, for example:

```
seed 2: promises.mkdir("<R>/d/f", {"recursive":true}): fake {"ok":"<R>/d/f"}, real {"ok":"<R>/d"}
seed 3: appendFileSync("<R>/d/e.txt", "x"): fake {"ok":{"undefined":true}}, real {"throw":"ENOENT"}
seed 4: mkdir("<R>/d/f/g", {"recursive":true}): fake {"ok":"<R>/d/f/g"}, real {"ok":"<R>/d/f"}
seed 5: readdir("<R>") -> sorted: fake {"ok":["a","d","seed.txt"]}, real {"ok":["d","seed.txt"]}
```

`fsWorld` brings the real temporary folder to the fake's world before a step first touches a path. When the target
was absent in the fake's world it copied nothing, so a folder the world held on the way (`<R>/d`, drawn by the seed)
was missing on the real side. Real Node answers by what the folders on the way hold
(`/tmp/w2f-probe/worldprobe.mjs`, Node 24.22.2):

```
the folder on the way absent: mkdirSync("<R>/d/f", {"recursive":true}) -> ok <R>/d
the folder on the way absent: mkdirSync("<R>/d/f/g", {"recursive":true}) -> ok <R>/d
the folder on the way absent: appendFileSync("<R>/d/e.txt", "x") -> throw ENOENT
the folder on the way absent: writeFileSync("<R>/a/x", "x") -> throw ENOENT
the folder on the way absent: statSync("<R>/a/x") -> throw ENOENT
the folder on the way made first (<R>/d, <R>/d/f, <R>/a folders): mkdirSync("<R>/d/f", {"recursive":true}) -> ok undefined
the folder on the way made first (<R>/d, <R>/d/f, <R>/a folders): mkdirSync("<R>/d/f/g", {"recursive":true}) -> ok <R>/d/f/g
the folder on the way made first (<R>/d, <R>/d/f, <R>/a folders): appendFileSync("<R>/d/e.txt", "x") -> ok undefined
the folder on the way made first (<R>/d, <R>/d/f, <R>/a folders): writeFileSync("<R>/a/x", "x") -> ok undefined
the folder on the way made first (<R>/d, <R>/d/f, <R>/a folders): statSync("<R>/a/x") -> throw ENOENT
<R>/a a file: mkdirSync("<R>/d/f", {"recursive":true}) -> ok <R>/d
<R>/a a file: mkdirSync("<R>/d/f/g", {"recursive":true}) -> ok <R>/d
<R>/a a file: appendFileSync("<R>/d/e.txt", "x") -> throw ENOENT
<R>/a a file: writeFileSync("<R>/a/x", "x") -> throw ENOTDIR
<R>/a a file: statSync("<R>/a/x") -> throw ENOTDIR
```

So the fake was right in each case, given the world it holds; the real side held a different world. The fix
(99245b4da1) copies each path on the way from the top, whether or not the target is held:

- a folder is made;
- a file is written with the fake's bytes, and the walk ends there (nothing lies under a file);
- a path the world holds as absent ends the walk;
- a path the run has already touched is the run's, and is left as it is.

The walk is decided by the fake's answers only, so the determinism run (real side off) asks the fake the same questions
in the same order. The decision lifted "do not edit the family" for this defect only. Nothing else in the families
changed.

### B. Request 'not a url', the lead's decision B

```
seed 2: new Request("not a url", {...}): fake {"ok":["POST","http://localhost/not%20a%20url",...]}, real {"throw":"TypeError"}
```

The family already compares against real Node's `Request` in this process. Node 24:

```
"/api/x" TypeError Failed to parse URL from /api/x ERR_INVALID_URL
"not a url" TypeError Failed to parse URL from not a url ERR_INVALID_URL
"" TypeError Failed to parse URL from  ERR_INVALID_URL
fetch /x TypeError Failed to parse URL from /x
```

w2c's fake resolved a URL with no base against a virtual page origin (`http://localhost/`). Node has no document to
resolve against. The Request subclass now passes its input to the platform's Request unchanged (b4631f233b), so `new
Request` throws and `fetch` rejects with Node's own TypeError and message. `ORIGIN` is gone. web.test's relative-URL
test now holds the fake to Node's own `fetch('/api/x')` rejection, message included. The w2c design note is updated. No
pair uses a relative URL (`fake_fetch` uses `https://api.example.com`).

### C. vscode, the lead's decision C (option b)

vscode is out of `exec/fakes/lib/index.mjs` ROWS (1e294f325a). The reason is recorded where w2d registered it: no
oracle on this machine (no extension host to record vectors from), and a fake with no oracle would certify itself. Its
import is the recording proxy again. `vscode.mjs` stays, unregistered, and the row to restore is written in the
comment. The conformance asks every package in `LIBRARY_FAKE_ROWS`, so it no longer asks vscode: 35 fakes where there
were 36.

- `protocol.test.mjs`: the three model clauses become one: the hook answers null and the import is the recording proxy.
- `tests/pairs/lib_vscode`: `heard` is PASS-bounded on both sides. Its `break` map is removed, because no mechanism is
  left to remove, and lib-break.mjs requires the verdict to change.
- The w2d design table is updated.

**axios `settle` and express response ops (`run: null`).** These cannot run through the hook alone, and I left them
unchanged.

- `settle` is an axios internal (lib/core/settle.js). It is not an export of the module the hook answers, and the
  clause reaches it through lane B's glue (`axios.mjs` `settle`, `VALIDATE`), asynchronously.
- The express clause reads a `Response` value built by the type hook (`libraryTypeFake`, by a parameter's declared
  type), not by the module hook.

Both run against the same recorded vectors in `exec/fakes/lib/protocol.test.mjs` (ALL PASS below). The conformance
lists them as "vectors not run (needs the lane's own glue)", and each package has other runnable clauses (axios getUri;
express has its own family), so neither is BAD.

## Red, then green (the conformance's own rows)

Before: `/tmp/w2f-before.txt` at bd48de0b, seed 1 (a copy is in `/tmp/w2f-runs/before-bd48de0b.txt`); A and B at
41d9666c, seeds 2 to 5 (`/tmp/w2f-runs/pre-seed*.txt`). After: HEAD, `/tmp/w2f-runs/post-seed*.txt`.

```
1 red   | fake | exec/fakes/index.mjs#node:fs | fs | agree | FAIL | 336 | case 0, step 10: promises.stat("<R>/a/x"): fake {"throw":"ENOENT"}, real {"throw":"ENOTDIR"} |
1 green | fake | exec/fakes/index.mjs#node:fs | fs | agree | PASS | 336 | the real fs in a temporary folder holding the fake's world where the script first reaches |
2 red   | fake | exec/fakes/index.mjs#node:fs/promises | fs/promises | agree | FAIL | 110 | case 1, step 10: stat("<R>/d/f/g"): fake {"throw":"ENOENT"}, real {"throw":"ENOTDIR"} |
2 green | fake | exec/fakes/index.mjs#node:fs/promises | fs/promises | agree | PASS | 110 | the real fs in a temporary folder holding the fake's world where the script first reaches |
3 red   | fake | exec/fakes/index.mjs#node:url | url | agree | FAIL | 268 | pathToFileURL("/C:\\xü//") -> href: fake {"ok":"file:///C:%5Cx%C3%BC"}, real {"ok":"file:///C:%5Cx%C3%BC/"} |
3 green | fake | exec/fakes/index.mjs#node:url | url | agree | PASS | 268 | the real module, in this process |
4 red   | fake | exec/fakes/index.mjs#node:timers | timers | virtual order | FAIL | 12 | case 4: ["timeout t0 2K nests 2K","interval t1 2K x1","timeout t2 3K"]: fake fired ["t0","t1#1","t2","t0n","t1#2","t1#3","t1#4","t1#5"], real ["t0","t1#1","t2","t0n"] |
4 red   | fake | exec/fakes/index.mjs#node:timers | timers | delay coercion | FAIL | 7 | delays [1,0]: fake fired ["c1","c0"], real ["c0","c1"] |
4 green | fake | exec/fakes/index.mjs#node:timers | timers | virtual order | PASS | 12 | the real event loop, delays K = 10 ms apart |
4 green | fake | exec/fakes/index.mjs#node:timers | timers | delay coercion | PASS | 7 | the real event loop |
5 red   | fake | exec/fakes/web/index.mjs#global:Response | Request/Response | agree | FAIL | 44 | Response.json({"undefined":true}, {"status":201}) -> fields, bodies: fake {"ok":[201,true,"",[["content-type","application/json"]],"default",false,false,"","",false]}, real {"throw":"TypeError"} (not provided: Request) |
5 green | fake | exec/fakes/web/index.mjs#global:Response | Request/Response | agree | PASS | 44 | the real module, in this process (not provided: Request) |
6 red   | fake | exec/fakes/web/index.mjs#global:fetch | fetch | json is the parse of text | FAIL | 72 | PUT https://api.example.com/users/0?q=1: text() "{}", json() {"ok":{"fake":"response:db41fcb1984d.json()"}}, JSON.parse(text) {"ok":{}} |
6 green | fake | exec/fakes/web/index.mjs#global:fetch | fetch | json is the parse of text | PASS | 72 |  |
7 red   | fake | exec/fakes/lib/index.mjs#vscode | library vectors | no runnable clause | FAIL | 0 | no clause of the protocol runs on vscode through the hook alone: neither a family here nor a vector clause with a run |
7 green (no row: vscode is no library fake; the import is the recording proxy, which the conformance does not certify)
A red   seed 3: | fake | exec/fakes/index.mjs#node:fs | fs | agree | FAIL | 336 | case 0, step 2: appendFileSync("<R>/d/e.txt", "x"): fake {"ok":{"undefined":true}}, real {"throw":"ENOENT"} |
A red   seed 5: | fake | exec/fakes/index.mjs#node:fs/promises | fs/promises | agree | FAIL | 106 | case 4, step 9: readdir("<R>") -> sorted: fake {"ok":["a","d","seed.txt"]}, real {"ok":["d","seed.txt"]} |
A green seed 3: | fake | exec/fakes/index.mjs#node:fs | fs | agree | PASS | 336 | the real fs in a temporary folder holding the fake's world where the script first reaches |
A green seed 5: | fake | exec/fakes/index.mjs#node:fs/promises | fs/promises | agree | PASS | 106 | the real fs in a temporary folder holding the fake's world where the script first reaches |
B red   seed 2: | fake | exec/fakes/web/index.mjs#global:Request | Request/Response | agree | FAIL | 36 | new Request("not a url", {"body":"","method":"post","mode":"cors","redirect":"error"}) -> fields, bodies: fake {"ok":["POST","http://localhost/not%20a%20url",...]}, real {"throw":"TypeError"} |
B green seed 2: | fake | exec/fakes/web/index.mjs#global:Request | Request/Response | agree | PASS | 36 | the real module, in this process (not provided: Response, Response.json, Response.error, Response.redirect) |
```

## Validators

1. Conformance (exit 0 at every seed; `--break` exit 1):

```
| FAKE-CONFORMANCE TOTAL | 35 fake(s) under exec/fakes, 35 pass | 12 of 12 good fixtures pass | 3 of 3 wrong fixtures refused | 204 clauses, 27808 checks | seed 1 | ALL PASS |
| FAKE-CONFORMANCE TOTAL | 35 fake(s) under exec/fakes, 35 pass | 12 of 12 good fixtures pass | 3 of 3 wrong fixtures refused | 204 clauses, 27841 checks | seed 2 | ALL PASS |
| FAKE-CONFORMANCE TOTAL | 35 fake(s) under exec/fakes, 35 pass | 12 of 12 good fixtures pass | 3 of 3 wrong fixtures refused | 204 clauses, 27795 checks | seed 3 | ALL PASS |
| FAKE-CONFORMANCE TOTAL | 35 fake(s) under exec/fakes, 35 pass | 12 of 12 good fixtures pass | 3 of 3 wrong fixtures refused | 204 clauses, 27795 checks | seed 4 | ALL PASS |
| FAKE-CONFORMANCE TOTAL | 35 fake(s) under exec/fakes, 35 pass | 12 of 12 good fixtures pass | 3 of 3 wrong fixtures refused | 204 clauses, 27791 checks | seed 5 | ALL PASS |
| FAKE-CONFORMANCE TOTAL | 35 fake(s) under exec/fakes, 35 pass | 12 of 12 good fixtures pass | 0 of 3 wrong fixtures refused | 204 clauses, 27811 checks | seed 1 | --break | 3 BAD |
```

Under `--break` the three BAD rows are the three wrong fixtures, ADMITTED (fs-previous-write, path-unnormalised,
timers-arm-order). In the plain runs they are refused on their named clauses.

2. Protocols and web tests:

```
node langs/ts/exec/fakes/protocols.mjs           -> exit 0
FAKE PROTOCOLS: 9 fakes, every protocol holds and every --break goes red: buffer 1/1 (break: 1 red); console 1/1 (break: 1 red); crypto 3/3 (break: 3 red); fs 6/6 (break: 5 red); os 1/1 (break: 1 red); path 4/4 (break: 4 red); process 3/3 (break: 3 red); timers 2/2 (break: 2 red); url 2/2 (break: 2 red)
node langs/ts/exec/fakes/protocols.mjs --break   -> exit 0, the same line
node --test langs/ts/exec/fakes/web/web.test.mjs                        -> exit 0: tests 13, pass 13, fail 0
LEAN_FAKES=recording node --test langs/ts/exec/fakes/web/web.test.mjs   -> exit 1: tests 13, pass 0, fail 13
node langs/ts/exec/fakes/lib/protocol.test.mjs   -> exit 0
library fakes protocol: ALL PASS: vector clauses lodash@4.18.1 15/600, zod@3.25.76 3/120, dayjs@1.11.23 4/160, luxon@3.7.2 2/80, date-fns@3.6.0 2/80, uuid@9.0.1 2/80, axios@1.21.0 2/80, express@4.22.3 1/40; 12 world clauses; 203 vendored files match their manifests
node langs/ts/exec/fakes/lib/protocol.test.mjs --break -> exit 1: library fakes protocol: 41 failure(s) (--break: the recording proxy)
```

3. Pairs:

```
JOBS=4 LEAN_PAIRS=fake_fs,fake_path,fake_crypto,fake_timers,fake_process,fake_path_row,fake_fetch,fake_url,fake_storage,bench_drops,new_unit node langs/ts/tests/run.mjs   -> exit 0
| WALL | 695 s | JOBS 4 |
| TOTAL | 1000 checks | ALL PASS |
```

The pairs that use timers or fetch beyond these (`git grep -l "setTimeout\|setInterval\|fetch(" langs/ts/tests/pairs`),
plus `lib_vscode` (its expectation changed):

```
JOBS=4 LEAN_PAIRS=callback_units,lane_b_reach,microtask_worker,promise_module_nullish,readme_search,rename_parameter,sandbox_boundary,schedule_explorer,this_param,timers,two_callers,window_timers,lib_vscode node langs/ts/tests/run.mjs   -> exit 0
| WALL | 970 s | JOBS 4 |
| TOTAL | 1020 checks | ALL PASS |
| pair | lib_vscode | lane B heard PASS-bounded | PASS |
```

Not run: the full suite, and `tests/lib-break.mjs` (lib_vscode has no break map now, so it is no longer among its rows).

## Left open

- vscode has no library fake until its vectors can be recorded from a real extension host. The model and the row to
  restore are in place.
- axios `settle` and express response ops still run only in `protocol.test.mjs`, not through the conformance's hook
  (reason above).
- The conformance's fake count drops from 36 to 35 (vscode).
