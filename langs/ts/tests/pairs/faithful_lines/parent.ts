// faithful_lines: a number operation written over several lines (a formatter's `Math.max(\n 0,\n ...)`) is read by the
// faithful rewrite as one call on one line (`Math.__lean_max2(0, ...)`); the line breaks it dropped go before the call's
// closing parenthesis, so the code after it keeps its lines and the file's faithful text translates. clamp reads an
// outside value (the doubles reading does not encode it, unknown), so lane A proves it through the faithful reading
// alone: y + 1 against 1 + y, the one uninterpreted addition on both sides. With LEAN_BREAK=faithful-lines the rewrite
// moves the lines after the call, the whole file's faithful text is refused, and clamp is not proved (real-only).
export interface Svc { get(x: number): number; }
export function clamp(svc: Svc, x: number): number {
  const y = svc.get(x);
  return Math.max(
    0,
    y + 1,
  );
}
export function shifted(svc: Svc, x: number): number {
  const y = svc.get(x);
  return Math.max(
    0,
    y + 1,
  );
}
