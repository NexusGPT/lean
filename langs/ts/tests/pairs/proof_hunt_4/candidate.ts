// must-not-prove units of class 4 (design/proof-hunt.md): each unit differs only through the place the class names;
// lane A must not prove any of them

// class 4: a loop helper that runs on after a callee faults inside an array callback
function check(x: number): void { if (x < 0) throw new Error("negative"); }
export function lastOk(xs: number[]): number { if (xs.length > 0) check(xs[xs.length - 1]); return 1; }
