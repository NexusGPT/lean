// a reference keyed by its kind and id: the candidate tests the id with Number.isSafeInteger where the parent tests
// Number.isInteger. The two differ only on an integer past the safe range (2^53 and above), behind a test of the kind
// read in lower case; the input search sets the id to the boundary just off the safe integers (design/w3c-search-inputs.md)
export interface Ref { kind: string; id: number }

export function refKey(r: Ref): string {
  if (r.kind.toLowerCase() === "user") {
    if (Number.isSafeInteger(r.id) && r.id > 0) return "u:" + r.id;
    return "invalid";
  }
  return "other";
}
