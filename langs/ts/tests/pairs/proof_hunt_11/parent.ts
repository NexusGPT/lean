// must-not-prove units of class 11 (design/proof-hunt.md): each unit differs only through the place the class names;
// lane A must not prove any of them

// class 11: a tagged template whose same-file tag function changed (the tag is named by its text)
function tag(s: TemplateStringsArray, ...v: number[]): string { return s.join("|"); }
export function tagged(x: number): string { return tag`a${x}b`; }
