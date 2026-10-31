// discriminated unions of records (design/heap-stage5.md section 12): a switch on the kind field, an if-chain on a
// numeric tag, and a union told apart by a key test (`in`), which stays refused
export interface Circle { kind: "circle"; radius: number }
export interface Square { kind: "square"; side: number }
export interface Rect { kind: "rect"; w: number; h: number }
export type Shape = Circle | Square | Rect;

export function area(s: Shape): number {
  switch (s.kind) {
    case "circle": return s.radius * s.radius * 3;
    case "square": return s.side * s.side;
    case "rect": return s.w * s.h;
  }
}

export function caption(s: Shape): string {
  switch (s.kind) {
    case "circle": return "round";
    case "square": return "four";
    default: return "four";
  }
}

export function perimeter(s: Shape): number {
  switch (s.kind) {
    case "circle": return s.radius * 6;
    case "square": return s.side * 4;
    default: return (s.w + s.h) * 2;
  }
}

export interface Ok { tag: 1; value: number }
export interface Fail { tag: 2; code: number }
export interface Pending { tag: 3; since: number }
export type Result = Ok | Fail | Pending;

export interface Done { status: "done"; value: number }
export interface Failed { status: "failed"; code: number }
export interface Waiting { status: "waiting"; since: number }
export type Reply = Done | Failed | Waiting;

export function score(r: Reply): number {
  if (r.status === "done") {
    return r.value;
  } else if (r.status === "failed") {
    return 0 - r.code;
  } else {
    return 0;
  }
}

export function settled(r: Result): boolean {
  if (r.tag === 1) return true;
  if (r.tag === 2) return true;
  return false;
}

export interface Fish { swim: number }
export interface Bird { fly: number }
export type Pet = Fish | Bird;

export function speed(p: Pet): number {
  if ("swim" in p) {
    return p.swim;
  }
  return p.fly;
}

export function grow(s: Shape): void {
  switch (s.kind) {
    case "circle":
      s.radius += 1;
      break;
    case "square":
    case "rect":
      break;
  }
  return;
}
