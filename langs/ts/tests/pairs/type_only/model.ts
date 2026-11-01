import type { Id } from './shapes';

function field(): PropertyDecorator {
  return () => {};
}

export class Entry {
  @field() id!: Id;
}
