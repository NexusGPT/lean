const app = { get(_path: string, _index: number, _callback: (n: number) => number): void {} };
app
  // A callee comment may contain an unmatched quote ' or parenthesis (
  .get('/a', 1, (n: number) => n + 1);
