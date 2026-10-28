// expect: prototype
// Reflect.hasMetadata is no row of the decorator table (translate/decorators.json): Reflect stays refused but for its rows
export function marked(target: object): boolean { return Reflect.hasMetadata("role", target); }
