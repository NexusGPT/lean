export const MODES = ['fast', 'safe'];
export const DEFAULT_MODE = 'safe';
export function pick(i: number): string {
  return MODES[i % MODES.length];
}
