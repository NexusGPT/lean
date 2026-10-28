export function count(label: string = "ready", ...items: string[]): number {
  return label.length + items.length;
}
export function changed(label: string = "ready", ...items: string[]): number {
  return items.length > 1 ? label.length : 0;
}
export function spread(label: string | undefined, items: string[]): number {
  return count(label, ...items);
}
