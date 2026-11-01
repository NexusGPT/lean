// a request routed by its normalised method and path: the candidate answers one route differently. The difference sits
// behind two nested equalities on string literals of the unit's text, each read after a normalisation (trim and upper
// case, the path before its query), so no drawn value reaches it on the suite's 30 inputs; the input search sets the
// path to the literal and reaches it (design/w3c-search-inputs.md)
export interface Request { method: string; path: string; body: string }

export function route(req: Request): number {
  const method = req.method.trim().toUpperCase();
  if (method === "POST") {
    const path = req.path.split("?")[0];
    if (path === "/orders") {
      return 201;
    }
    return 404;
  }
  return 405;
}
