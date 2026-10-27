// expect: callback-form
// a callee that changes its argument: the argument here is the array's element
interface Log { write(x: string): void; }
interface Item { name: string; seen: boolean; }
let sink: Log | undefined;
function mark(item: Item): string { item.seen = true; sink?.write(item.name); return item.name; }
export function marked(items: Item[]): string[] {
  return items.map(mark);
}
