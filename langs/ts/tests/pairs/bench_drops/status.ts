// a hook of this package reached through the `@/` alias: it loads, and the work it starts settles after the render
import { notify } from '@/settings';
export function useStatus(code: number): string {
  void Promise.resolve(code).then((c) => c + 1).then((c) => notify(String(c)));
  return code > 3 ? 'high' : 'low';
}
