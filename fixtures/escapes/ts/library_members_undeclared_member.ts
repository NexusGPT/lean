// expect: unsupported-member
// a member the type does not declare, on a type that is complete (nothing in it reaches an unresolved module)
interface Request {
  params: { provider: string };
}
export function nameOf(req: Request): string {
  return String(req.name);
}
