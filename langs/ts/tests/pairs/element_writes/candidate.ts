// A field write through a parameter's element path (`p[i].f`, `p[i]!.f`, `(p[i] as T).f`, `p.a[i].b`) is a heap step on
// that element, the step `p.f = v` takes on the parameter itself; the parameter is an output of the unit.
type W = { a: number } | null;
type Row = { typed: string; winner: W };
type Item = { qty: number; name: string };
type Order = { rows: Item[]; total: number };
type Line = { item: Item; note: string };

// the same write, the index renamed
export function mark(rows: Row[]): number {
  for (let j = 0; j < rows.length; j++) {
    const r = rows[j];
    if (r === undefined) continue;
    (rows[j] as Row).winner = { a: r.typed.length };
  }
  return rows.length;
}

// the winner written into each row itself: the same fields, but the caller's rows are the same objects as before
export function stamp(rows: Row[]): number {
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    if (r === undefined) continue;
    rows[i]!.winner = { a: r.typed.length };
  }
  return rows.length;
}

// the same sum by forEach, the same store through the element
export function settle(o: Order, i: number): number {
  let sum = 0;
  o.rows.forEach((r) => {
    sum += r.qty;
  });
  if (0 <= i && i < o.rows.length) {
    o.rows[i].qty = sum;
    return sum;
  }
  return sum;
}

// the same loop, its step written as a compound assignment
export function clear(lines: Line[]): number {
  for (let i = 0; i < lines.length; i += 1) {
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

// the same raise written out, through the element cast to its own type
export function bump(items: Item[], v: number): number {
  if (items.length > 0) {
    (items[0] as Item).qty = items[0].qty + v;
    return items[0].qty;
  }
  return 0;
}

// nothing written: the rows keep their quantities
export function zero(o: Order): number {
  return o.total;
}
