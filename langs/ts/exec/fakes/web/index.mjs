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
  const s = storageOf(v); if (s) return { $storage: s.entries() };
  return undefined;
}
