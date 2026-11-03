// units whose own trailing parameters a caller may leave out
export function scale(value: number, factor = 2): number {
  return value * factor;
}

export function pad(text: string, width?: number): string {
  const w = arguments.length < 2 ? 4 : width;
  return typeof w === 'number' && w > 0 && w < 12 ? text.padStart(w, '.') : text;
}
