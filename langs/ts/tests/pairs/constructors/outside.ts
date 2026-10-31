// an outside function: it may install an own property on whatever it is handed, a method's name too
export function patch(o: { count: number }): void {
  (o as any).bumped = () => 99;
}
