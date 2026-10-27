// expect: promise-all-order conditional
export async function send(values: string[]): Promise<void> {
  for (const value of values) {
    await fetch(value);
  }
}
