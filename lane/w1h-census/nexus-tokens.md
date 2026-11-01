# Census: <code>nexus-tokens</code>

Date: 2026-11-01 (UTC)

Units: 64. Inside the subset: 48 (75 percent). Refused: 16. Files unreadable: 0.

Skipped: appledouble/binary 17 (17 AppleDouble, 0 binary), never units.

By stratum (census.mjs stratumOf): written 64 units (48 inside, 17 files; 75 percent); generated 0 units (0 inside, 0 files); minified 0 units (0 inside, 0 files). The share above is over all code; the regression floor R6 binds that share.

| Entered | Environment-blocked | Language-refused |
| ---: | ---: | ---: |
| 48 | 0 | 10 |

Each refused unit is counted once, under the first rule the lint names for it. A unit whose module or global still does not resolve is environment-blocked instead, under `environment: <kind>` of its first such finding.

Directory depth: 2. A dot means the repository root.

## Top five rules by units stopped

| Rule | Units stopped |
| --- | ---: |
| <code>non-null-assertion</code> | 5 |
| <code>dynamic-key</code> | 3 |
| <code>param-mutation</code> | 2 |

## Rule: <code>non-null-assertion</code>

Units stopped: 5.

| Directory | Units stopped | Example |
| --- | ---: | --- |
| <code>src/ramp</code> | 3 | <code>src/ramp/generate.ts:123  TEXT_CONTRAST_TARGET[step]!</code> |
| <code>tools</code> | 2 | <code>tools/analyse-source-palette.ts:40  match[1]!</code> |

## Rule: <code>dynamic-key</code>

Units stopped: 3.

| Directory | Units stopped | Example |
| --- | ---: | --- |
| <code>src/ramp</code> | 3 | <code>src/ramp/generate.ts:100  spec.overrides?.[theme]</code> |

## Rule: <code>param-mutation</code>

Units stopped: 2.

| Directory | Units stopped | Example |
| --- | ---: | --- |
| <code>src/semantic</code> | 2 | <code>src/semantic/resolve.ts:52  ramps.set(key, ramp)</code> |

## New units against their declarations (census.mjs --new-units, design/w1h-new-units.md)

Every named unit of the first 1000 written source files, read as a unit no parent holds (30 inputs each), the root's own tests that import the file as its PR tests: 9 files, 44 units (40 NEW, 4 ASK, 0 REFUSE), 40 loaded, 29 s.

Inputs: 1200 drawn (530 at an edge value of the declared type), 1200 admitted by the declaration, 360 in a call that asked nothing of the world.

| record | units | records |
|---|---:|---:|
| `new:fault` | 0 | 0 |
| `new:shape` | 0 | 0 |
| `new:test` | 0 | 0 |
| `new:coverage` | 36 | 62 |

Tests: 10 test files in the root; 713 tests name a unit read here: 12 pass, 0 fail, 701 reached the world, 0 use what the runner model does not hold, 0 did not settle.

| coverage reason | records |
|---|---:|
| draw: every admitted input reached the world | 27 |
| test: the test reached the world | 24 |
| test: the test file did not load | 7 |
| load: /root/census-installs/w1h/nexus-tokens/tools/preview-ramps.ts | 4 |

