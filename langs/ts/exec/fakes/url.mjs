// `url`: Node's own pure functions and classes (node:url), so a parsed or formatted URL is the value Node computes. A
// relative path made a file URL is resolved against the fake world's working directory (`/app`), never the host's.
import nodeUrl from 'node:url';
import { entries } from './common.mjs';
import { resolveIn } from './path.mjs';

export function urlModel() {
  const calls = {
    fileURLToPath: (a) => nodeUrl.fileURLToPath(...a),
    pathToFileURL: (a) => nodeUrl.pathToFileURL(resolveIn(a[0])),
    format: (a) => nodeUrl.format(...a), parse: (a) => nodeUrl.parse(...a), resolve: (a) => nodeUrl.resolve(...a),
    domainToASCII: (a) => nodeUrl.domainToASCII(a[0]), domainToUnicode: (a) => nodeUrl.domainToUnicode(a[0]),
    urlToHttpOptions: (a) => nodeUrl.urlToHttpOptions(a[0]),
    'URL.canParse': (a) => URL.canParse(...a), 'URL.parse': (a) => (URL.parse ? URL.parse(...a) : (() => { try { return new URL(...a); } catch { return null; } })()),
  };
  const classes = { URL: (a) => new URL(...a), URLSearchParams: (a) => new URLSearchParams(...a) };
  return entries({ name: 'url', calls, pure: [...Object.keys(calls), 'URL', 'URLSearchParams'], classes });
}
