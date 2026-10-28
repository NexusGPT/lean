// expect: prototype
// a made object handed to a call the file does not read may come back to any unit: the wide rule holds
import { register } from './registry';
export type Bag = Record<string, number>;
export function tagged(d: Bag, k: string): boolean { return k in d; }
export function share(): void { register(Object.create(null) as Bag); }
