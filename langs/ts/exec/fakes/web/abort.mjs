// AbortController and AbortSignal: the real classes (the DOM standard's, Node's), with the one part that reads a clock,
// `AbortSignal.timeout(ms)`, on lane B's virtual clock: the signal aborts with the standard's TimeoutError when the
// clock reaches its due instant, armed as every timer of the unit is (env.arm), so it fires in due order beside the
// unit's own timers and never by the host's wall clock. DOMException, the class an abort's reason has, is the host's.
export const HostAbortController = globalThis.AbortController;
export const HostAbortSignal = globalThis.AbortSignal;
export const HostDOMException = globalThis.DOMException;

export function abortSignalClass(env) {
  const timeout = (ms) => {
    const c = new HostAbortController();
    env.arm('timeout', () => c.abort(new HostDOMException('The operation was aborted due to timeout', 'TimeoutError')), ms);
    return c.signal;
  };
  return new Proxy(HostAbortSignal, { get(t, p, r) { return p === 'timeout' ? timeout : Reflect.get(t, p, r); } });
}
export const renderSignal = (s, render) => ({ aborted: s.aborted, ...(s.aborted ? { reason: render(s.reason) } : {}) });
