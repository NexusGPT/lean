// The heap core, stage 4: a field or parameter of a literal union holds one of its values; the values enter the
// unit's hypothesis, so a refactor that relies on the union being exhausted is proved.
export type Task = { title: string; state: "open" | "done"; level: 1 | 2 | 3 };

// the other value tested first: equal only because the state is one of the two
export function toggle(t: Task): number {
  if (t.state === "done") {
    t.state = "open";
    return 0;
  }
  t.state = "done";
  return 1;
}

// the top level weighs one less
export function weight(t: Task): number {
  if (t.level === 3) {
    return 9;
  }
  return t.level;
}

// the other value tested first
export function mark(s: "open" | "done"): string {
  if (s === "open") {
    return " ";
  }
  return "x";
}

// whether the task is finished
export function finished(t: Task): boolean {
  return t.state === "done";
}
