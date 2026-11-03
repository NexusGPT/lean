// a package the manifest declares and the checkout does not install
import { v7 } from 'uuid';

export class Ids {
  next(): string { return v7(); }
}
