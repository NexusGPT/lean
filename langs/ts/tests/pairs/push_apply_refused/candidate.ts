// The apply/call forms this reading leaves refused (design/push-apply.md), each by the rule its escape fixture names
// (push_apply, push_apply_list, push_apply_this, library_members_push_apply): the parent writes the refused form, the
// candidate the direct call. Lane A refuses both sides of every unit alike (lint and translator); lane B judges them.

export function listAny(a: string[], list: any): number {
  a.push(...list);
  return a.length;
}

export function onRecord(a: string[], c: { length: number; [i: number]: string }, b: string[]): number {
  Array.prototype.push.apply(c, b);
  return c.length;
}

export class Bag {
  items: string[] = [];
  addAll(b: string[]): number {
    this.items.push(...b);
    return this.items.length;
  }
}

export function bound(a: string[], b: string[]): number {
  a.push(...b);
  return a.length;
}
