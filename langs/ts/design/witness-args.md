# Lane B: a witness's args are the input as drawn

The construct: a unit that writes its argument (`balances.set(k, v)`, `acc.balance = ...`, `xs.push(x)`) and whose
candidate writes something else. Lane B finds the difference on the argument after the call and reports a WITNESS.
Before this reading the witness's `args` were rendered after both calls, from the parent's copy
(`sides.parent.inputs.map(render)` in `exec/run.mjs`), so they showed the parent's writes. On the README pair
`readme_ledger`, unit `applyAll`, input 12, the args Map held the two accounts the parent's call had posted, with their
balances; the candidate's run had started from the same drawn Map without them. A reader replaying the witness from the
certificate started from the wrong state.

## The reading

`witness.args` is the input as DRAWN, rendered before either side runs. Each side draws its own copy: `mountSides`
gives each side a fresh `Environment` seeded `seed * 7919 + i` and draws input i on it (`inputPlan(...).draw`: an
enumerated heap's builder for the first inputs, then `inputsFor` with `aliasInputs`), so the two copies are distinct
objects built from one seed. Right after the draw, and before either call, the copy is rendered by `renderDrawn`
(`exec/fake.mjs`); the witness carries the parent's rendering. The two renderings are equal by construction; when they
are not (a harness defect), the candidate's is carried beside it as `drawnCandidate`. `witness.parent` and
`witness.candidate` keep their post-call renderings: outcome, heap, receiver, trace, pending. Nothing else in the
observation changes, so every verdict and every `where` stays as it was.

Sharing is kept. `renderDrawn` first counts every object it would walk into (arrays, Maps, Sets, records and class
instances; fakes, dates, errors, regular expressions and promises are leaves). An object reached twice, from two
positions or from itself, is named by first sight: its first appearance is `{ "$ref": k, "value": ... }` and each later
one `{ "$ref": k }`. An object reached once renders exactly as `render` renders it, so an input without sharing has the
same args text as before. `heap_graph` `addTag`, input 1, where `user.tags` and the second argument are one array:

    [{"id":"a","tags":{"$ref":0,"value":["new","vk85x","v7zoh","abc"]}},{"$ref":0}]

The old rendering rendered each position apart, so these two positions showed two equal arrays and the sharing was
lost; inside one position a second sight showed `{"$cycle": true}`, which named no target.

The retained-state programs (`exec/programs.mjs`) had the same defect: a command's `args` were rendered after the
command ran. They now use `renderDrawn` before the call too. The environment programs, the races, the finite lane and
the command sequences carry no drawn argument values (their witnesses name commands, seeds and prop assignments taken
before the run), so nothing changes there.

## Soundness

The verdicts do not change: the comparison still reads both sides' post-call observations (`firstDifference`), and the
drawn rendering is never compared. Rendering reads only own properties of plain inputs and the two marker properties of
a fake (`__isFake`, `__fakePath`), which record nothing on the trace; so drawing, then rendering, leaves both runs
exactly as they were. A wrong drawn rendering could only mislead a reader, never prove two behaviours equal; the
replay check below is what keeps it honest.

## The check

`exec/replay-args.mjs` replays a witness: it draws input i again on a fresh environment seeded as the parent's side was,
runs the parent on it with `observe`, and reads three things: the witness's args equal that draw; the replay's
observation equals the witness's parent observation; every argument position the parent's call wrote shows, in the
args, its value before the write. `--kind writes` asks that some witness had a written position, `--kind pure` that
none had. The suite runs it on every unit a pair lists under `witnessArgs` in its `expect.json`, and on `readme_ledger`
`applyAll` from the suite itself (that pair's sources untouched). On the certificate written before this change, the
check reads `sameDraw: false` and `shownBefore: false` for the Map, which gained the two posted keys; after it, both
read true.

## Lane A

Untouched. The pair `witness_args` holds a Map key added (`addKey`), a record field written (`deposit`), an array push
(`pushItem`), a pure unit whose outcome changes (`scaled`), a refactor through a local (`sumBoth`, proved) and an
untouched unit (`count`, proved).
