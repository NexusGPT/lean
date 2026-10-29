import { remote, http } from 'lib';
export interface Items { collect(f: (x: number) => number): number[]; }
export interface Bus { on(topic: string, handler: () => number): void; }
export interface Deep { on(topic: string, handler: () => () => () => () => number): void; }

// a refactor inside a callback handed to a fake: an arrow against a function expression
export function mapRefactor(xs: Items): number[] { return xs.collect(function (x) { return x + 1; }); }
// the same callback, its behaviour changed
export function mapDiffers(xs: Items): number[] { return xs.collect((x) => x + 2); }
// a callback inside the options handed to a fetch wrapper, its parameter renamed
export function fetchItems(url: string): unknown { return http.get(url, { transform: (b: any) => b.items, retries: 2 }); }
// callbacks inside a list of questions handed to a prompt (the eslint promptUser shape), the parameter renamed
export function ask(): unknown { return remote.prompt([{ name: 'source', type: 'list' }, { name: 'style', when: (given: any) => given.source === 'guide' }]); }
// the same list, the compared constant changed: only a drive that meets the constant shows it
export function askDiffers(): unknown { return remote.prompt([{ name: 'source', type: 'list' }, { name: 'style', when: (answers: any) => answers.source === 'guide' }, { name: 'other', when: (answers: any) => answers.source === 'prompt' }]); }
// a returned closure, rewritten
export function adder(n: number): (x: number) => number { return function (y) { const r = y + n; return r; }; }
// a handler handed to a fake's `.catch`, rewritten
export function load(key: string): unknown { return remote.load(key).catch(function (err: any) { const m = err.message; return m; }); }
// more functions than one observation drives: the drive budget is spent on both sides, undecided
export function many(bus: Bus): number { for (let i = 0; i < 70; i++) { try { bus.on(String(i), function () { return i; }); } catch (e) { /* a faulted request: the next one */ } } return 70; }
// a function handed out by three nested drives (deeper than the drive depth): undecided on both sides; the unit's own change lane A proves
export function deep(bus: Deep, n: number): number { bus.on('a', () => () => () => () => 1); return 1 + n; }
// a counter whose third invocation differs: the drive calls a function it drives three times, so the third call shows it
export function counter3(): () => number { let n = 0; return () => { n += 1; return n > 2 ? n + 1 : n; }; }
// a closure over module state the unit advances on every call: the first call's closure agrees, the second call's differs;
// one call and its drives never show it, the environment programs (call, call, invoke) do
let made = 0;
export function ticket(): () => number { made += 1; const mine = made; return () => (mine > 1 ? mine + 1 : mine); }
