export const MODES = ['fast', 'safe'];
export function pick(i: number): string {
  return MODES[i % MODES.length];
}
