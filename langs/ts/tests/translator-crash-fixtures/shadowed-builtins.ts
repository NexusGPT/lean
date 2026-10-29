class Base {}
// These module-local names are ordinary classes, not standard-library carriers.
export class Set extends Base { constructor(public value: number) { super(); } }
export class ReadonlySet extends Base { constructor(public value: number) { super(); } }
export class Map extends Base { constructor(public value: number) { super(); } }
export class ReadonlyMap extends Base { constructor(public value: number) { super(); } }
export function setValue(x: Set): number { return 1; }
export function readonlySetValue(x: ReadonlySet): number { return 1; }
export function mapValue(x: Map): number { return 1; }
export function readonlyMapValue(x: ReadonlyMap): number { return 1; }
