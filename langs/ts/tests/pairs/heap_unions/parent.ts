// The heap core, stage 4: a field or parameter of a literal union holds one of its values; the values enter the
// unit's hypothesis, so a refactor that relies on the union being exhausted is proved.
export type Task = { title: string; state: "open" | "done"; level: 1 | 2 | 3 };

// flips the state and says whether the task is now done
export function toggle(t: Task): number {
  if (t.state === "open") {
    t.state = "done";
    return 1;
  }
  t.state = "open";
  return 0;
}

// the weight of a task by its level
export function weight(t: Task): number {
  if (t.level === 3) {
    return 10;
  }
  return t.level;
}

// the mark of a state given directly
export function mark(s: "open" | "done"): string {
  if (s === "done") {
    return "x";
  }
  return " ";
}

// whether the task is finished
export function finished(t: Task): boolean {
  return t.state === "done";
}
