// expect: dynamic-key
const CODE: Record<number, string> = { 400: "BAD_REQUEST", 404: "NOT_FOUND" };
// an absent key reads undefined, which `string` leaves out: a lookup typed `string` would claim a value it cannot hold
export function code(status: number): string {
  return CODE[status] ?? "HTTP";
}
