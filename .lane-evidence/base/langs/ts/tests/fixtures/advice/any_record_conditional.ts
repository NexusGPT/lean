// expect: any-type conditional
export function title(node: any): string {
  if (node.kind === "heading") return node.text.trim();
  return node.children.length > 0 ? String(node.children[0].id) : "";
}
