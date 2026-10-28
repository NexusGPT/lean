// the same shapes through a class member and a base-class member
const TAG = /#(\w+)/i;

export class Base {
  norm(text: string): string {
    return text.trim() + " #all";
  }
  label(): string {
    return "base class";
  }
}

export class Parser extends Base {
  strict(text: string): boolean {
    return TAG.test(text);
  }
  loose(text: string): boolean {
    return TAG.test(this.norm(text));
  }
  name(): string {
    return "the parser";
  }
}
