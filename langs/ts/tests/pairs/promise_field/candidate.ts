export interface Slots { open(id: string): Promise<undefined>; close(id: string): Promise<undefined>; last: Promise<undefined> | null; }
export interface Jobs { start(id: string): Promise<void>; stop(id: string): Promise<void>; }
export class Shelf {
  last: Promise<undefined> | null = null;
  pending: Promise<void> | null = null;
  count = 0;
  // changed: the candidate stores the other held promise of undefined in the receiver's nullable field
  stash(slots: Slots, id: string): void {
    const a = slots.open(id);
    const b = slots.close(id);
    this.last = b;
  }
  // changed: the candidate stores the other held void promise in a field typed Promise<void> | null
  hold(jobs: Jobs, id: string): void {
    const a = jobs.start(id);
    const b = jobs.stop(id);
    this.pending = b;
  }
  // changed: the parent clears the field, the candidate stores the held promise
  clear(slots: Slots, id: string): void {
    const a = slots.open(id);
    this.last = a;
  }
  // refactor: the local that holds the promise is renamed, the same transitions in the same order
  keep(slots: Slots, id: string): void {
    const held = slots.open(id);
    this.last = held;
  }
  // untouched
  bump(): number {
    this.count = this.count + 1;
    return this.count;
  }
}
// changed: the candidate stores the other held promise in the parameter's nullable field
export function park(slots: Slots, id: string): void {
  const a = slots.open(id);
  const b = slots.close(id);
  slots.last = b;
}
