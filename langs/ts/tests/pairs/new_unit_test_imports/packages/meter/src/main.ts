// the package's entry is its build (dist/main.js, dist/main.d.ts), built from this file
export class Meter {
  read(): number { return document.title.length; }
}
