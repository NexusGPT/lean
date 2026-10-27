export interface Jobs { start(id: string): Promise<void>; stop(id: string): Promise<void>; track(p: Promise<void>): void; both(p: Promise<void>, q: Promise<void>): void; note(text: string): void; }
export interface Slots { open(id: string): Promise<undefined>; close(id: string): Promise<undefined>; keep(p: Promise<undefined>): void; put(id: string, p: Promise<undefined>): void; }
export interface Gates { lift(id: string): Promise<null>; drop(id: string): Promise<null>; hold(p: Promise<null>): void; }
// changed: the candidate awaits the two handles in the other order, so a double rejection throws the other error
export async function order(jobs: Jobs, id: string): Promise<void> {
  const a = jobs.start(id);
  const b = jobs.stop(id);
  await a;
  await b;
}
// changed: the candidate hands the outside the other void promise
export function track(jobs: Jobs, id: string): void {
  const a = jobs.start(id);
  const b = jobs.stop(id);
  jobs.track(a);
}
// changed: the candidate hands the outside the other promise of undefined
export function absent(slots: Slots, id: string): void {
  const a = slots.open(id);
  const b = slots.close(id);
  slots.keep(a);
}
// changed: the candidate returns the other void promise, held in a record, without awaiting it
export function handout(jobs: Jobs, id: string): { done: Promise<void> } {
  const a = jobs.start(id);
  const b = jobs.stop(id);
  return { done: a };
}
// changed: the candidate hands the outside the two void promises in the other order
export function swap(jobs: Jobs, id: string): void {
  const a = jobs.start(id);
  const b = jobs.stop(id);
  jobs.both(a, b);
}
// changed: the candidate hands the outside the other promise of undefined, beside a key
export function stash(slots: Slots, id: string): void {
  const a = slots.open(id);
  const b = slots.close(id);
  slots.put(id, a);
}
// changed: the candidate hands the outside the other promise of null
export function gate(gates: Gates, id: string): void {
  const a = gates.lift(id);
  const b = gates.drop(id);
  gates.hold(a);
}
// refactor: the held handle renamed and the label inlined, the same transitions in the same order
export async function held(jobs: Jobs, id: string): Promise<void> {
  const a = jobs.start(id);
  const label = 'job-' + id;
  jobs.track(a);
  jobs.note(label);
  await a;
}
// refactor: the candidate takes the handle through a same-file handle unit
export async function relay(jobs: Jobs, id: string): Promise<void> {
  const p = jobs.start(id);
  jobs.track(p);
  await p;
}
// untouched: a handle unit returning the outside call's handle
export function begin(jobs: Jobs, id: string): Promise<void> {
  return jobs.start(id);
}
// untouched
export function name(id: string): string {
  return 'job-' + id;
}
