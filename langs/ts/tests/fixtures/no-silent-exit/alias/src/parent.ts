import { double } from '@/util';
// calls the aliased same-package helper
export const scaled = (x: number): number => double(x) + 1;
