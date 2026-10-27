// expect: receiver-write
// a free function writing through an array on its receiver's path: an array is a sequence, not a record of fields;
// build the new array and assign it to the field
export type Shelf = { items: string[]; size: number };
export function clear(this: Shelf): number {
  this.items.length = 0;
  this.size = 0;
  return this.size;
}
