// Whether a flag named by two parts is the feature flag.
export function flag(a: string, b: string): boolean {
  return a + b === 'feature-x';
}

// Whether three positive integers solve the cube equation.
export function cube(x: bigint, y: bigint, z: bigint): boolean {
  return x > 0n && y > 0n && z > 0n && x * x * x + y * y * y === z * z * z;
}
