// expect: destructuring
// a catch clause binds one name, not a pattern
export function message(x: number): string {
  try {
    if (x < 0) throw new Error('negative');
    return 'ok';
  } catch ({ message }) {
    return String(message);
  }
}
