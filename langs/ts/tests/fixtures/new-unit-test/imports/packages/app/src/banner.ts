// an alias no tsconfig path names and no package provides
import { VERSION } from '@/meta/version';

export class Banner {
  text(): string { return 'v' + VERSION; }
}
