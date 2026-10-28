// expect: unsupported-call
// shift as a value on a field of this: the removal reads and writes the field in one statement
export class Queue {
  items: string[] = [];
  take(): string | undefined {
    return this.items.shift();
  }
}
