declare const app: { get(path: string, cb: (n: number) => number): void };
declare const router: { post(path: string, cb: (n: number) => number): void };
declare function describe(label: string, cb: () => void): void;
declare function defineConfig(cb: (n: number) => number): void;
app.get('/a', n => n + 1);
router.post('/b', function (n) { return n * 2; });
describe('parses', () => { app.get('/nested', n => n); });
export default defineConfig(n => n);
export function outer(xs: number[]) {
  return xs.map(n => n + 1);
}
