const mode = __BUILD_MODE__ ? 'debug' : 'release';
const { clamp } = hostPrimitives;

export function label(n: number): string {
  return n >= 2 ? mode : 'low';
}

export function bounded(n: number): number {
  return clamp(n);
}
