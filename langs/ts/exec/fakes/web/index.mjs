// The web platform's behavioural fakes (design/w2c-web-fakes.md): the globals a unit of browser or edge code reaches,
// each built once per environment, and the rendering of the platform objects whose state lives in internal slots (the
// generic rendering, fake.mjs render, reads own fields only and showed each as `{}`).
import { fetchFake, Request, Response, HostFormData, HostBlob, HostRequest, HostResponse, renderRequest, renderResponse } from './fetch.mjs';
import { HostHeaders, renderHeaders } from './headers.mjs';
import { HostURL, HostURLSearchParams, renderURL, renderSearchParams } from './url.mjs';
import { HostAbortController, HostAbortSignal, HostDOMException, abortSignalClass, renderSignal } from './abort.mjs';
import { HostTextEncoder, HostTextDecoder, renderEncoder, renderDecoder } from './encoding.mjs';
import { hostStructuredClone } from './clone.mjs';
import { storageGlobals, storageOf } from './storage.mjs';

// global name -> the value lane B's sandbox holds under it
export function webGlobals(env) {
  return {
    fetch: fetchFake(env), Request, Response, Headers: HostHeaders, FormData: HostFormData, Blob: HostBlob,
    URL: HostURL, URLSearchParams: HostURLSearchParams, TextEncoder: HostTextEncoder, TextDecoder: HostTextDecoder, structuredClone: hostStructuredClone,
    AbortController: HostAbortController, AbortSignal: abortSignalClass(env), DOMException: HostDOMException,
    ...storageGlobals(env),
  };
}

// a platform object's rendering, or undefined for any other value
export function renderWeb(v, render) {
  const s = storageOf(v); if (s) return { $storage: s.entries() };
  const proto = Object.getPrototypeOf(v);
  if (proto === null || Object.getPrototypeOf(proto) === null) return undefined; // a plain record of either realm (its prototype is an Object.prototype): no platform object, and the common case of every rendering
  if (v instanceof HostURL) return renderURL(v);
  if (v instanceof HostURLSearchParams) return renderSearchParams(v);
  if (v instanceof HostHeaders) return renderHeaders(v);
  if (v instanceof HostRequest) return renderRequest(v);
  if (v instanceof HostResponse) return renderResponse(v);
  if (v instanceof HostAbortController) return { $abortController: renderSignal(v.signal, render) };
  if (v instanceof HostAbortSignal) return { $abortSignal: renderSignal(v, render) };
  if (v instanceof HostDOMException) return { $error: 'DOMException', name: v.name }; // the standard's name is the error's kind (AbortError, TimeoutError); its message is the engine's text
  if (v instanceof HostTextEncoder) return renderEncoder(v);
  if (v instanceof HostTextDecoder) return renderDecoder(v);
  return undefined;
}

// The hook exec/fake.mjs reads (behaviouralFake, behaviouralGlobals) and conformance/fakes.mjs tests (`lookup` +
// `globalsOf`): a specifier (`global:<name>`) -> its fake, built once per environment. Module specifiers: none of the
// web fakes is a module; the Node core modules are exec/fakes/index.mjs (modelAt), the member registry the recording
// proxy asks on every operation. Any specifier under LEAN_FAKES=recording is the recording proxy's (fake.mjs BEHAVIOURAL).
const GLOBAL_SETS = [webGlobals];
export function globalsOf(env) { return (env.behaviouralGlobals ??= Object.assign({}, ...GLOBAL_SETS.map((make) => make(env)))); }
export function lookup(env, specifier) {
  if (specifier.startsWith('global:')) { const g = globalsOf(env); const name = specifier.slice(7); return Object.hasOwn(g, name) ? g[name] : null; }
  return null;
}
// the rendering of a value a behavioural fake made whose state the generic rendering cannot read, or undefined
export const RENDERERS = [renderWeb];
