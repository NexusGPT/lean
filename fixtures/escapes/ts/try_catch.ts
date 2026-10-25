// expect: try-catch
export function safe(x: number): number {
  try {
    return x + 1;
  } catch (e) {
    return 0;
  }
}
