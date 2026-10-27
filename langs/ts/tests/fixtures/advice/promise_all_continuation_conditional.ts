// expect: promise-all-order conditional
export async function load(values: string[]): Promise<number[]> {
  return await Promise.all(values.map(async value => {
    const response = await fetch(value);
    console.log(value);
    return response.status;
  }));
}
