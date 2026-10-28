// expect: load
// candidate-unit: f
import { absent } from "./absent-new-unit-module";
export function f(): number { return absent; }
