// must-not-prove units of class 1 (design/proof-hunt.md): each unit differs only through the place the class names;
// lane A must not prove any of them
export type H = { accept: string; [k: string]: string | undefined };

// class 1: an open key on a record type with declared fields and a string index signature
export function openKey(h: H, k: string): string | undefined { return h[k]; }
export function dotKey(h: H): string | undefined { return h.other; }
export function inKey(h: H, k: string): boolean { return k in h; }
