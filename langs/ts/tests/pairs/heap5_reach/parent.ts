// three readings the heap core shares with the ordinary lane: the bitwise reading (x | 0 and ~~x are ToInt32), a loop
// whose body never changes the world returns the world it was given, and a for-of loop in a real-number file
export function mean(xs: number[]): number {
  if (xs.length === 0) return 0;
  let total = 0;
  for (const x of xs) total += x;
  return total / xs.length;
}

export function whole(x: number): number {
  return x | 0;
}

export function half(xs: number[]): number {
  let total = 0;
  for (const x of xs) total += x;
  return total / 2;
}
