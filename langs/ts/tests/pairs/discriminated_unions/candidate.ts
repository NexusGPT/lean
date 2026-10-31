// discriminated unions of records (design/heap-stage5.md section 12): a switch on the kind field, an if-chain on a
// numeric tag, and a union told apart by a key test (`in`), which stays refused
export interface Circle { kind: "circle"; radius: number }
export interface Square { kind: "square"; side: number }
export interface Rect { kind: "rect"; w: number; h: number }
export type Shape = Circle | Square | Rect;

export function area(s: Shape): number {
  switch (s.kind) {
    case "circle": return s.radius * s.radius * 3;
    case "square": return s.side * s.side + 1;
    case "rect": return s.w * s.h;
  }
}

export function caption(s: Shape): string {
  if (s.kind === "circle") return "round";
  return "four";
}

export function perimeter(s: Shape): number {
  switch (s.kind) {
    case "rect": return 2 * (s.h + s.w);
    case "square": return 4 * s.side;
    case "circle": return 6 * s.radius;
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
  switch (r.status) {
    case "done": return r.value;
    case "failed": return 0 - r.code;
    default: return 0;
  }
}

export function settled(r: Result): boolean {
  return r.tag !== 3;
}

export interface Fish { swim: number }
export interface Bird { fly: number }
export type Pet = Fish | Bird;

export function speed(p: Pet): number {
  if ("fly" in p) {
    return p.fly;
  }
  return p.swim;
}

export function grow(s: Shape): void {
  if (s.kind === "circle") {
    s.radius += 1;
  }
}
