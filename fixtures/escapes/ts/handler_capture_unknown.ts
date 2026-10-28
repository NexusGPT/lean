// expect: react-handler-capture
import { useCallback } from "react";
import { makeApi } from "api";
import { useRouter } from "next/router";
import { keep } from "service";
// a value from an outside call that is no hook: its mutating method is no request the capture table names
export function unknownCallee(n: number) {
  const api = makeApi();
  return useCallback(() => api.push(n), [api, n]);
}
// a hook result handed on as a value: the callee it reaches may write it
export function handedOn(n: number) {
  const router = useRouter();
  keep(router);
  return useCallback(() => router.push(`/p/${n}`), [router, n]);
}
