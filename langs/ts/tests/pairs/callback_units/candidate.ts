const app = { get(_path: string, _handler: (n: number) => number): void {} };
app.get('/changed', n => n + 2);
app.get('/same', function(n) { return n * 2; });
export function outer(xs: number[]): number[] {
  const offset = 2;
  return xs.map(n => n + offset);
}
