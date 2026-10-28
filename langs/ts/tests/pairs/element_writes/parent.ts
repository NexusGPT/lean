// A field write through a parameter's element path (`p[i].f`, `p[i]!.f`, `(p[i] as T).f`, `p.a[i].b`) is a heap step on
// that element, the step `p.f = v` takes on the parameter itself; the parameter is an output of the unit.
type W = { a: number } | null;
type Row = { typed: string; winner: W };
type Item = { qty: number; name: string };
type Order = { rows: Item[]; total: number };
type Line = { item: Item; note: string };

// the winner of every row, written through the element (the repro's form, `as Row` on the element)
export function mark(rows: Row[]): number {
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    if (r === undefined) continue;
    (rows[i] as Row).winner = { a: r.typed.length };
  }
  return rows.length;
}

// the winner of every row, each row replaced by a copy holding it
export function stamp(rows: Row[]): number {
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    if (r === undefined) continue;
    rows[i] = { typed: r.typed, winner: { a: r.typed.length } };
  }
  return rows.length;
}

// the sum of the quantities, stored into the i-th row of the order when there is one
export function settle(o: Order, i: number): number {
  let sum = 0;
  for (const r of o.rows) {
    sum = sum + r.qty;
  }
  if (0 <= i && i < o.rows.length) {
    o.rows[i].qty = sum;
    return sum;
  }
  return sum;
}

// every line's item emptied, through two steps below the element
export function clear(lines: Line[]): number {
  for (let i = 0; i < lines.length; i++) {
    lines[i].item.qty = 0;
  }
  return lines.length;
}

// the winner of every row through a non-null element (the repro's other form), untouched
export function crown(rows: Row[]): number {
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    if (r === undefined) continue;
    rows[i]!.winner = { a: r.typed.length };
  }
  return rows.length;
}

// the first item's quantity raised through a non-null element
export function bump(items: Item[], v: number): number {
  if (items.length > 0) {
    items[0]!.qty += v;
    return items[0].qty;
  }
  return 0;
}

// every row's quantity emptied through the element forEach hands its callback
export function zero(o: Order): number {
  o.rows.forEach((r) => {
    r.qty = 0;
  });
  return o.total;
}
