#!/usr/bin/env node
// The conformance of the date rows (translate/library.json `packages`, amendment A10, design/w2d-library-rows.md).
// A date export the table lists under `pure` is read by lane A as a function of its arguments, the same on both sides;
// that holds only if its value does not depend on the world's time zone. So every pure date export runs, in the
// vendored package (the code lane B runs), on the boundary instants (31 January, 29 February, 31 December, and the
// DST switch days of the zones below, each at local midnight and across the switch hour) under four zones, and every
// output must be the same in all four. A row whose value moves with the zone is a transition, never a row.
// The table must name a call for every pure date export (a row added without its conformance call fails), and every
// transition the table lists for reading the local calendar must move in some zone on these inputs (the reason the
// table gives is checked, not assumed).
// --break: addDays (a transition: it reads the local calendar) moved to `pure`: the zone check fails (red).
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { requireVendored, manifestOf } from './load.mjs';
import { dateFnsFile } from './index.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const BREAK = process.argv.includes('--break');
const ZONES = ['UTC', 'America/New_York', 'Europe/Berlin', 'Australia/Lord_Howe']; // Lord Howe: a half-hour DST shift
const H = 3600000;
// the instants: the boundary days of A10 at 00:00 and 23:30 UTC, and the DST switch instants of the zones (2024)
const DAYS = ['2024-01-31', '2024-02-29', '2024-12-31', '2023-12-31', '2024-03-10', '2024-11-03', '2024-03-31', '2024-10-27', '2024-04-07', '2024-10-06'];
const INSTANTS = DAYS.flatMap((d) => [Date.parse(`${d}T00:00:00Z`), Date.parse(`${d}T23:30:00Z`)])
  .concat([Date.parse('2024-03-10T07:00:00Z'), Date.parse('2024-11-03T06:00:00Z'), Date.parse('2024-03-31T01:00:00Z'), Date.parse('2024-10-27T01:00:00Z'), Date.parse('2024-04-06T15:00:00Z'), Date.parse('2024-10-05T15:30:00Z')]);
const PAIRS = INSTANTS.flatMap((a, i) => INSTANTS.filter((_, j) => j % 3 === i % 3).map((b) => [a, b]));
// one call per export: its arguments drawn from the instants (two dates, or a date and an amount)
const AMOUNTS = [0, 1, -1, 23, 24, 25, 61, -1441];
const CALLS = {
  isBefore: (f) => PAIRS.map(([a, b]) => f(new Date(a), new Date(b))),
  isAfter: (f) => PAIRS.map(([a, b]) => f(new Date(a), new Date(b))),
  isEqual: (f) => PAIRS.map(([a, b]) => f(new Date(a), new Date(b))),
  isValid: (f) => [...INSTANTS, NaN].map((a) => f(new Date(a))),
  isDate: (f) => [...INSTANTS.map((a) => new Date(a)), 0, '2024-01-31', null].map((a) => f(a)),
  compareAsc: (f) => PAIRS.map(([a, b]) => f(new Date(a), new Date(b))),
  compareDesc: (f) => PAIRS.map(([a, b]) => f(new Date(a), new Date(b))),
  getTime: (f) => INSTANTS.map((a) => f(new Date(a))),
  getUnixTime: (f) => INSTANTS.map((a) => f(new Date(a))),
  differenceInMilliseconds: (f) => PAIRS.map(([a, b]) => f(new Date(a), new Date(b))),
  differenceInSeconds: (f) => PAIRS.map(([a, b]) => f(new Date(a), new Date(b))),
  differenceInMinutes: (f) => PAIRS.map(([a, b]) => f(new Date(a), new Date(b))),
  differenceInHours: (f) => PAIRS.map(([a, b]) => f(new Date(a), new Date(b))),
  addMilliseconds: (f) => INSTANTS.flatMap((a) => AMOUNTS.map((n) => +f(new Date(a), n * 999))),
  addSeconds: (f) => INSTANTS.flatMap((a) => AMOUNTS.map((n) => +f(new Date(a), n * 59))),
  addMinutes: (f) => INSTANTS.flatMap((a) => AMOUNTS.map((n) => +f(new Date(a), n * 30))),
  addHours: (f) => INSTANTS.flatMap((a) => AMOUNTS.map((n) => +f(new Date(a), n))),
  subMilliseconds: (f) => INSTANTS.flatMap((a) => AMOUNTS.map((n) => +f(new Date(a), n * 999))),
  subSeconds: (f) => INSTANTS.flatMap((a) => AMOUNTS.map((n) => +f(new Date(a), n * 59))),
  subMinutes: (f) => INSTANTS.flatMap((a) => AMOUNTS.map((n) => +f(new Date(a), n * 30))),
  subHours: (f) => INSTANTS.flatMap((a) => AMOUNTS.map((n) => +f(new Date(a), n))),
  fromUnixTime: (f) => INSTANTS.map((a) => +f(a / 1000)),
  toDate: (f) => INSTANTS.map((a) => +f(new Date(a))),
  max: (f) => PAIRS.map(([a, b]) => +f([new Date(a), new Date(b)])),
  min: (f) => PAIRS.map(([a, b]) => +f([new Date(a), new Date(b)])),
  // the calendar transitions, each run to see that it moves with the zone
  addDays: (f) => INSTANTS.flatMap((a) => AMOUNTS.map((n) => +f(new Date(a), n))),
  addWeeks: (f) => INSTANTS.flatMap((a) => AMOUNTS.map((n) => +f(new Date(a), n))),
  addMonths: (f) => INSTANTS.flatMap((a) => AMOUNTS.map((n) => +f(new Date(a), n))),
  addYears: (f) => INSTANTS.flatMap((a) => AMOUNTS.map((n) => +f(new Date(a), n))),
  subDays: (f) => INSTANTS.flatMap((a) => AMOUNTS.map((n) => +f(new Date(a), n))),
  startOfDay: (f) => INSTANTS.map((a) => +f(new Date(a))),
  endOfDay: (f) => INSTANTS.map((a) => +f(new Date(a))),
  startOfMonth: (f) => INSTANTS.map((a) => +f(new Date(a))),
  endOfMonth: (f) => INSTANTS.map((a) => +f(new Date(a))),
  differenceInDays: (f) => PAIRS.map(([a, b]) => f(new Date(a), new Date(b))),
  differenceInCalendarDays: (f) => PAIRS.map(([a, b]) => f(new Date(a), new Date(b))),
  isSameDay: (f) => PAIRS.map(([a, b]) => f(new Date(a), new Date(b))),
};
const row = JSON.parse(fs.readFileSync(path.join(here, '../../../translate/library.json'), 'utf8')).packages.find((p) => p.package === 'date-fns');
const pure = Object.values(row.pure).flat().concat(BREAK ? ['addDays'] : []);
const calendar = Object.entries(row.transition).find(([why]) => /local calendar/.test(why))[1].filter((x) => CALLS[x] && !pure.includes(x) && dateFnsFile(manifestOf('date-fns'), x));

// a child: every call's outputs in this process's zone
if (process.argv.includes('--child')) {
  const env = { ctx: vm.createContext({}), module: (s) => { throw new Error(`date-fns asked for ${s}`); } };
  const m = manifestOf('date-fns');
  const out = {};
  for (const name of [...pure, ...calendar]) {
    if (!dateFnsFile(m, name)) { out[name] = null; continue; } // not vendored: the parent reports it
    const mod = requireVendored(env, 'date-fns', dateFnsFile(m, name));
    out[name] = JSON.stringify(CALLS[name](mod[name]));
  }
  process.stdout.write(JSON.stringify(out));
  process.exit(0);
}

const failures = [];
for (const name of pure) if (!CALLS[name]) failures.push(`${name}: a pure date row with no conformance call`);
for (const name of pure) if (!dateFnsFile(manifestOf('date-fns'), name)) failures.push(`${name}: a pure date row whose source is not vendored (the row's reading was read in no file lane B runs)`);
const runs = {};
for (const tz of ZONES) {
  const r = spawnSync(process.execPath, [fileURLToPath(import.meta.url), '--child', ...(BREAK ? ['--break'] : [])], { encoding: 'utf8', env: { ...process.env, TZ: tz }, maxBuffer: 1 << 26 });
  if (r.status !== 0) { console.log(`date rows: the run under ${tz} failed\n${r.stderr}`); process.exit(1); }
  runs[tz] = JSON.parse(r.stdout);
}
for (const name of pure) {
  if (!CALLS[name] || runs.UTC[name] === null) continue;
  const moved = ZONES.filter((tz) => runs[tz][name] !== runs.UTC[name]);
  if (moved.length) failures.push(`${name}: listed pure, but its value moves with the zone (${moved.join(', ')})`);
}
for (const name of calendar) if (ZONES.every((tz) => runs[tz][name] === runs.UTC[name])) failures.push(`${name}: listed as reading the local calendar, but no zone moves it on these inputs`);
const n = INSTANTS.length;
if (failures.length) { console.log(`date rows: ${failures.length} failure(s)${BREAK ? ' (--break: addDays read as pure)' : ''}\n  ${failures.join('\n  ')}`); process.exit(1); }
console.log(`date rows: ${pure.length} pure date-fns exports the same under ${ZONES.length} zones on ${n} instants (${DAYS.length} boundary and DST days), ${PAIRS.length} pairs; ${calendar.length} calendar transitions each move in some zone`);
