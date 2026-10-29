#!/usr/bin/env node
// A proof that rests on a fact the file declares (a receiver marked @sealed, so `this.m()` is the class's own m:
// design/conformance-readings.md) names that fact in the certificate: lanes.A.assumptions holds the translation's ASSUME
// lines and the verdict's reason says the proof holds under them. Exit 1 when the proof is silent about it.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { check } from '../check.mjs';
const here = path.dirname(fileURLToPath(import.meta.url));
const pair = path.join(here, 'pairs/override_outside');
const r = await check({ parent: path.join(pair, 'parent.ts'), candidate: path.join(pair, 'candidate.ts'), unit: 'Sealed.run', n: 3, project: false, dafnySeconds: 30 });
const a = r.certificate?.lanes?.A ?? {};
const named = Array.isArray(a.assumptions) && a.assumptions.some((s) => /^sealed receiver Sealed\./.test(s));
if (r.verdict !== 'PASS-proved' || !named || !/declared assumption/.test(String(r.reason ?? ''))) { console.error(`FAIL verdict ${r.verdict}; assumptions ${JSON.stringify(a.assumptions ?? null)}; reason ${r.reason ?? null}`); process.exit(1); }
console.log(`sealed-assumption: Sealed.run PASS-proved under ${a.assumptions.length} declared assumption(s), named in the certificate: ${a.assumptions.join('; ')}`);
