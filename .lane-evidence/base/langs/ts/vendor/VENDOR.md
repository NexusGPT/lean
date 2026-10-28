# Vendored packages

Lane B's environment-program runner (`exec/program.mjs`) uses fast-check's model-based commands: the shrinking of a
failing program and its replay path. Two packages are vendored as their ESM builds with their licences, nothing else
(no CJS, no tests, no docs); `fast-check.js` imports `pure-rand` by relative path (the eight bare specifiers rewritten).

| package | version | licence | from |
|---|---|---|---|
| fast-check | 4.10.2 | MIT (Nicolas Dubien) | https://registry.npmjs.org/fast-check/-/fast-check-4.10.2.tgz |
| pure-rand | 8.4.2 | MIT (Nicolas Dubien) | https://registry.npmjs.org/pure-rand/-/pure-rand-8.4.2.tgz |

To update: fetch the tarball, copy `lib/fast-check.js`, `lib/rolldown-runtime-*.js`, `lib/fast-check.d.ts` and `LICENSE`
(fast-check) or `lib/esm` and `LICENSE` (pure-rand), rewrite the `pure-rand/<subpath>` imports to
`../../pure-rand/lib/esm/<subpath>.js`, and run the suite.
