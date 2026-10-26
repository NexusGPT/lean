// expect: conditional-effect
function change(xs: number[]): number { xs.push(1); return xs.length; }
export function guarded(on: boolean, xs: number[]): number | false { return on && change(xs); }
