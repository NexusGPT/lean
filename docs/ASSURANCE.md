# Assurance case

What the code under test reaches, what lean records and never records, and the gate's attacks. Each line names the
check that enforces it after `check:`; `node scripts/assurance-check.mjs` finds every named check, runs it and
exits 1 when one is missing or red. A line marked "no check" states a limit, not a guarantee.

## 1. The execution lane's sandbox

Each version runs in its own `node:vm` context built by `sandbox()` (`langs/ts/exec/run.mjs` line 415), against
recording fakes (`langs/ts/exec/fake.mjs`).

- The network: `fetch` is a fake (run.mjs line 438); a call is recorded with its arguments and sends nothing.
  `check: sandbox: fetch is a recording fake and sends nothing`
- Imports: every package and every Node built-in (`fs`, `child_process`, `http`), so every import but a file of the
  package, is a fake module (run.mjs line 504); `react` and its JSX runtime are lean's models (lines 490, 491). A call
  on a fake is recorded; no file is written, no process starts.
  `check: sandbox: a package or built-in import is a recording fake, never the real module`
- The host's environment: `process` is a fake (run.mjs line 434), so `process.env` answers fakes, never the host's
  variables. `check: sandbox: the host environment never reaches the unit or the trace`
- The clock and randomness: `Date`, `performance.now` and `process.hrtime` answer seeded, advancing instants and are
  recorded; `Math.random` draws from the seed (run.mjs line 442). `check: runtime clock-read`
  `check: sandbox: random draws are seeded, the same for the same seed`
- Answers: a fake answers from the seed and the request's path, so both versions see the same answers; a call into the
  world faults on a seeded draw of about one in twelve (fake.mjs line 71); more than 20000 requests stop the run as a
  budget (fake.mjs line 94); a synchronous call runs under the vm's timeout (run.mjs line 562).
  `check: fakes: one seed and one path give one answer, faults are seeded, and past 20000 requests the run stops`
- A run never ends without a verdict: a drained event loop or a budget stop is ASK with exit 2.
  `check: runtime no-silent-exit`
- Limit, no check: `node:vm` is not a security boundary. The globals hand the context the host's `Object`, and
  `Object.constructor('return process')()` reaches the host's real `process` (probe of 2026-10-28, `typeof ... .pid`
  answered `number`). lean's vm context records and fakes the world; it does not contain hostile unit code, which can
  reach the host process; containment is the gate's kernel profile and proxy (sections 5 and 6).

## 2. The loader's path validation

The package root is the nearest folder above the file holding a `package.json` (`findRoot`, run.mjs line 1009).

- A module is inside the root only when its real path (`fs.realpathSync`) equals the root's real path or starts with it
  followed by a path separator (`insideRoot`, run.mjs line 457). One that is not inside is the environment's fake module
  (`env.module`, the same fake as a package); lean has no separate refusal verdict for an outside module.
- A relative import is compiled and loaded only when it is inside the root (run.mjs line 487); one that leaves the
  root is a fake. `check: loader: a relative import that leaves the package root is a recording fake`
- A sibling folder whose name starts with the root's name (`pkg-evil` beside `pkg`) is outside the root.
  `check: loader: a sibling folder that shares the root's name prefix is outside the root and is a recording fake`
- A symbolic link inside the root that points to a file outside it is outside the root, since its real path is tested;
  a link that stays inside the root loads.
  `check: loader: a symbolic link inside the root that points outside it is a recording fake`
- A relative `.json` import is read only when it is inside the root (run.mjs line 486); outside, it is a fake and the
  file is never read. `check: loader: a relative .json file outside the package root is a recording fake, never read`
- An alias from the project's `paths` is loaded only when it is inside the root (run.mjs line 493).
  `check: loader: a paths alias that resolves outside the package root is a recording fake`
- A relative asset import (`.css`, images, fonts, `.md`, `.html`, `.wasm`) is a fake module and is never read (run.mjs
  line 484). `check: loader: an asset import is a fake module, never read`

## 3. What lean records, and what it never records

The certificate of `langs/ts/check.mjs` (line 66 onward) holds: the tool name; each input file's path and the first 16
hex digits of its SHA-256 (line 32); the unit; lane B's verdict, reason and bound (inputs run, seed, time limit, fake
policy) with each witness's input, its drawn arguments and the source lines on each side (line 79); lane A's lemma
results, the Dafny summary line, the SHA-256 prefixes of the theorem and the prelude, the output of `dafny --version`,
the time limit and the temporary folder (line 150).
`check: certificate: the input files by SHA-256, the bound with its seed, the theorem hash and the Dafny version`

- Held: `timing`, the wall-clock seconds of each lane that ran (`B`, `correspondence`, `doubles`, `translate`, `theorem`,
  `dafny`); a lane that did not run has no key. No verdict reads it ([`langs/ts/design/certificate-timing.md`](../langs/ts/design/certificate-timing.md)).
  `check: runtime certificate-timing`

- Never held: the producer's words. `check.mjs` reads only the two files, the unit, the scope file, `--project` and
  its numeric options (line 246); any other text given beside them reaches neither the verdict nor the certificate.
  The one text it reads from the candidate besides code is a `// lean-adapter` comment (line 226): an input map the
  proof then states as its claim, named in the certificate.
  `check: certificate: words given beside the files never reach the verdict or the certificate`
- Never held: the host's environment variables and real network answers (section 1). Held when the unit hands them to
  the outside: the generated inputs and the values the unit passes to a fake; the source text of the lines a witness
  names. A secret written literally in the source file can therefore appear in a witness.
- The pull-request run (`langs/ts/pr.mjs`) skips a changed file whose name is a secret's (`.env*`, `id_rsa*`, `.pem`,
  `.key`, `.p12`, `.pfx`, `.jks`) by its name, before reading anything else of it (lines 111 and 122).
  `check: intake: a secret-named file is skipped by its name and its content is never read`
  `check: repo pr intake`
- The run record: `pr.mjs` writes each checked row with its key and context to `.lean/cache/<key>.json` (lines 238
  and 286); every run but a preview carries a run identity (line 240; section 4).

## 4. The toolchain

- The TypeScript compiler and fast-check are vendored under `langs/ts/vendor`, pinned by lean's commit.
- The run identity hashes lean's commit, the hashes of the library and advice tables and the Dafny version string
  (`runIdentity` and `runTools`, pr.mjs lines 43 and 51); a change to any of them is a new identity.
  `check: run identity: lean's commit, its tables and the Dafny version each change the identity`
- The certificate's `tools` record (check.mjs line 151) holds `node` (`process.version`), `dafny` (the text of
  `dafny --version`) and `z3` (the text of `z3 --version`, run on the one Z3 solve/z3.mjs looks up: LEAN_Z3, else the
  Z3 bundled in a `z3/bin` folder beside the dafny executable, else the `z3` on PATH; `z3Path` is that executable,
  `z3Source` names which, and `z3` is null with the reason in `z3Source` when none answers). Dafny is given that
  executable (`--solver-path`) and the doubles reading runs it, so the record names the binary that ran.
  `tests/z3-pinned.mjs` `node` is recorded on every certificate; `dafny` and `z3` once lane A has
  run Dafny. `check: certificate: the tools record holds the Node version, the Dafny version text and the version Z3 reports`
- Limits, no check: lean records these versions as text and does not hash the `dafny`, Z3 or `node` binaries.
- In the gate, outside lean: the release instrument of experiment M35 (version 4) calls `node` and the database
  tools by absolute path, holds the SHA-256 of each binary and its library closure in a signed reference, and checks
  them again before each spawn. No check here.

## 5. The broker, outside lean

lean does not ship the broker; the paper's design (`sections/03-method.tex` line 7, Algorithm `alg:gate` line 33): on
PASS a broker seals a read-only image I and mints a one-use token bound to h(I); production runs I only. Its prototypes,
outside this repository, with no check here:

- Read-only image (M35, version 4): the accepted build is sealed into a read-only disk image; the gate hashes the
  image and its subtrees against a signed reference and serves from the read-only mount, so a write fails.
- One-use token (M26): a token is an HMAC over its id, channel, scope and expiry, bound to one channel and one scope
  string, and consumed by the first verifier that accepts it; the issuer's secret is read inside the issuer and never
  printed; the sandbox profile makes the issuer's folder unreadable to the build. In that prototype the token binds a
  channel and a scope, not h(I); the binding to the image hash is the paper's design and is not in the prototype code.

## 6. The paper's attacks, with their counts

Quoted from the paper's Section 4.6 (`sections/04-results.tex` line 31, `\label{sec:mediation}`; no macro in
`numbers.tex` holds them; the rows are in Table `tab:register`, `tables/register.tex` lines 58 to 77):

- The effect proxy with a one-use token "stopped 20 of 20 planted effects and 10 of 10 routes around it; a kernel
  sandbox alone let 12 of 20 through".
- The first release broker "refused 10 of 10 alterations planted by its builder". "An independent attacker then
  passed 8 of 10"; "a second passed 8 of 10 against the repaired version"; "a third passed 6 of 10
  against a version that seals the build into a read-only image with a pinned toolchain and refuses all 30 earlier
  alterations".
- "Every successful alteration used a resource the gate shared with the producer." The register's row for the third
  attack lists the six misses: a same-user signing key, a use-time replay, a volume stacked on the mount point, a
  template clone written after its digest, a same-user toolchain tree, a port squat.

These counts measure the prototypes, not this repository.
