// the uuid declarations the pair reads (@types/uuid 9, narrowed)
declare module 'uuid' { export function v4(): string; export function validate(s: string): boolean; }
