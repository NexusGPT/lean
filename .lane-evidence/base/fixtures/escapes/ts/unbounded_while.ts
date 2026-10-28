// expect: label
export function labelledBlock(n: number): number {
  exit: {
    if (n > 0) break exit;
    return 1;
  }
  return 0;
}
