// stage 5 step 12: a discriminated union of records is a reference whose cell is one of the alternatives, holding
// one of its discriminant values; a test of the discriminant narrows it
export interface Circle { kind: "circle"; radius: number }
export interface Square { kind: "square"; side: number }
export type Shape = Circle | Square;

export function size(s: Shape): number {
  if (s.kind === "circle") {
    return s.radius;
  }
  return s.side;
}

export function isRound(s: Shape): boolean {
  return s.kind === "circle";
}

export function grow(s: Shape): void {
  if (s.kind === "circle") {
    s.radius += 1;
  } else {
    s.side += 1;
  }
}

export function describe(s: Shape): string {
  return s.kind === "square" ? `side ${s.side}` : `radius ${s.radius}`;
}
