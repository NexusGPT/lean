# The bridge fake: lean's fake for an unset global answers calls and calls back

Owner's decision (2026-10-31, board row 664561c3), verbatim: "Yes I told you to allow it and I even told you to have
an allow list and deny list in lean." The question was whether lean's fake for an unset global (a desktop app's
bridge) may answer a call with a thenable that resolves to another fake, and call the callbacks handed to it, so apps
like cherry-studio and waveterm mount, or stay inert (those apps unrendered, cause named).

## What was there before

Lane B's sandbox (`exec/run.mjs` `sandbox`) named its own global object `window`, `globalThis` and `global`. A member
the host application sets and the sandbox does not hold (`window.api`, `window.electron`, which an Electron preload
puts there) was `undefined`, so `window.api.userName()` threw a TypeError. A component that reads its data from such
a bridge in an effect stayed at its first render; its trace named the cause (`effect-throw` with the TypeError). The
ordinary fakes (`exec/fake.mjs`) are never thenable: `await fake` yields the fake.

## The contract (`exec/bridge.mjs`)

- **Which names.** A member read of the global object (`window.X`, `globalThis.X`, `global.X`, and `X in window`)
  that the sandbox does not hold is the bridge fake `global:X` when X is on the allow list (`BRIDGE_ALLOW`, empty
  today), or on neither list and declared by no default lib file of the TypeScript lean runs (`declare var|let|const|
  function|class|namespace|enum` in `lib.*.d.ts`). A lib-declared name (`navigator`, `localStorage`, `location`,
  `matchMedia`, `addEventListener`) is a host name the sandbox leaves absent, as `design/lib-globals.md` reads it. The
  deny list (`BRIDGE_DENY`) holds the names no lib declares that a browser extension sets and an app's own mount does
  not have: the Redux, React and Vue devtools hooks. A write (`window.X = v`) lands on the global object; the name is
  then the app's value.
- **Whether the host set it** is a fact of the world (`design/lib-globals.md`), drawn per input by the seed and the
  name (`bridgePresent`): set on about three inputs in four (`BRIDGE_PRESENT`), absent on the others, the same on both
  sides of one input. A mount that rests on the bridge runs on most inputs, and the app's own absent branch
  (`window.api?.x`, `(g.config ?? d).port`) runs too: an always-present bridge cost the pair `module_forms` its
  `optionalGlobal` witness (`globalThis.config` absent: `undefined` against `0`), which the draw restores.
- **A property read** of a bridge fake is a bridge fake at the longer path, never a drawn null, empty list or
  primitive (the ordinary fake's varied answer).
- **A call** answers a thenable whose `then` resolves, after the current turn (a microtask), to the bridge fake at the
  call's path (`global:api.userName()#1`, the counter per path per environment). It never throws and never rejects:
  no fault draw. Under the race explorer the resolution is held by its scheduler, as a typed promise is.
- **A function handed as an argument** is called once, after the turn, with one bridge fake argument
  (`<call path>#cb<i>.arg0`). A throw inside it is recorded (`callback-throw`) and stays there.
- **Rendering.** A bridge fake renders as its path (`{ $fake: path }`) in every outcome, the thenable as the value it
  resolves to; its text (`String(v)`) is its path; it iterates as an empty list.
- **Both sides** of a pair receive the same fakes in the same order: the paths and counters are per environment and
  every resolution takes the same turn, so a difference between the two sides is the app's (pair unit `Status`).
- **Names it reaches beyond a desktop bridge.** Every name no lib declares: a third-party script's global
  (`window.posthog`, `window.gtag`, `window.FB` in the census copies) is a bridge fake on the inputs that set it, as a
  page that loaded that script holds it. A name the owner wants absent always goes on `BRIDGE_DENY`.
- **What it does not do.** No real value (a string, a number, a list with elements), no network, no file, no second
  call of a callback, no rejection, no member typed from the app's own declaration of the bridge.

## Two mount gates the contract needed

- A component whose first render returns `null` until its data arrives was not mounted further: the mount re-rendered
  after its effects only when the first render was an element. It now re-renders when the unit registered an effect
  and the state changed (`observeWindow`), as React does. The mount's effects also settle (two turns) before the state
  is read, as `settleEffects` settles every later round; a continuation an effect started (an answered call's `then`)
  is that effect's work.
- A useState setter handed a fake stores it: the fake is the value the world answered, never React's updater form.
  Calling it asked the world a question the app never asked (a second, spurious bridge call).

## The render row (`lanes.B.bound.render.bridge`)

`{ calls, callbacks }`: the distinct bridge calls the fake answered on the parent's mounts (by call path, so N is the
calls one mount made when every input mounts alike) and the distinct callbacks it fired. A reader sees how much of a
mount rested on fakes. Like the rest of the row it is written after the observations, from values lane B already held,
and changes no verdict (`design/certificate-timing.md`).

## Checks

- Pair `bridge_fake_thenable`: `Greeting` awaits a bridge call and renders its answer, `Theme` renders when the
  callback it handed the bridge is called: before, both unrendered (`component` false, the TypeError in the trace);
  after, both mounted, the row `bridge` 1 call and 0 callbacks, 1 call and 1 callback. `Status`'s candidate renders a
  constant where the parent renders the answer: PASS-bounded before (nothing mounted), WITNESS after.
- `exec/bridge.test.mjs`: the name lists, a read, a call's thenable and its turn, a callback once with a fake, the
  counts, two environments of one seed alike.
