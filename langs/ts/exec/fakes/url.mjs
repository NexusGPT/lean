// `url`: Node's own pure functions and classes (node:url), so a parsed or formatted URL is the value Node computes. A
// relative path made a file URL is resolved against the fake world's working directory (`/app`), never the host's.
import nodeUrl from 'node:url';
import { entries } from './common.mjs';
import { resolveIn } from './path.mjs';

// Node's pathToFileURL (lib/internal/url.js) on the fake working directory: the path resolved, then the trailing
// separator the resolve strips put back (`'/a/b/'` is `file:///a/b/`, a folder's URL); a path that is not a string is
// Node's own refusal (ERR_INVALID_ARG_TYPE)
function pathToFileURL(p) {
  if (typeof p !== 'string') return nodeUrl.pathToFileURL(p);
  let r = resolveIn(p); if (p.endsWith('/') && !r.endsWith('/')) r += '/';
  return nodeUrl.pathToFileURL(r);
}

export function urlModel() {
  const calls = {
    fileURLToPath: (a) => nodeUrl.fileURLToPath(...a),
    pathToFileURL: (a) => pathToFileURL(a[0]),
    format: (a) => nodeUrl.format(...a), parse: (a) => nodeUrl.parse(...a), resolve: (a) => nodeUrl.resolve(...a),
    domainToASCII: (a) => nodeUrl.domainToASCII(a[0]), domainToUnicode: (a) => nodeUrl.domainToUnicode(a[0]),
    urlToHttpOptions: (a) => nodeUrl.urlToHttpOptions(a[0]),
    'URL.canParse': (a) => URL.canParse(...a), 'URL.parse': (a) => (URL.parse ? URL.parse(...a) : (() => { try { return new URL(...a); } catch { return null; } })()),
  };
  const classes = { URL: (a) => new URL(...a), URLSearchParams: (a) => new URLSearchParams(...a) };
  return entries({ name: 'url', calls, classes, quiet: true });
}
