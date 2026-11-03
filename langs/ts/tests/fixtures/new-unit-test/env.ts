// a unit that reads an environment variable (lane w9bg): the test sets it to what lean's process answered, or deletes
// it, and puts it back after
export function greeting(prefix: string): string {
  const name = process.env.GREETING_NAME;
  return name ? `${prefix} ${name}` : `${prefix} stranger`;
}
