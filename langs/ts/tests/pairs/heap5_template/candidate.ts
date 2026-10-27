// stage 5 step 1: a template literal is a string concatenation, each hole by ToString: a string is itself, a
// boolean its name, a number a function of the number alone, an absent value its name
export interface User { name: string; age: number; admin: boolean; nick?: string }

export function greet(u: User): string {
  return `Hi ${u.name} (${u.age})`;
}

export function badge(u: User): string {
  const n = u.name;
  if (u.admin) {
    return n + ":true";
  }
  return `${n}:false`;
}

export function years(u: User): string {
  return `${u.age + 0} years`;
}

export function handle(u: User): string {
  return `@${u.nick}`;
}

export function stamp(u: User, n: number): string {
  return u.name + "#" + `${n}` + "10";
}
