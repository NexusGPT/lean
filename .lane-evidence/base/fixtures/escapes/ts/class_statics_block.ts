// expect: global-read
// a static block sets the class's statics on import, outside every unit: its statics stay module state
class Table {
  static size = 0;
  static {
    Table.size = 8;
  }
}
export function capacity(n: number): number {
  return n * Table.size;
}
