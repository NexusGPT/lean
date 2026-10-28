// expect: react-handler-capture
import { useCallback, useMemo, useRef } from "react";
import { makeApi } from "api";
import { useRouter, useList } from "next/router";
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
// a hook result the translator reads as data (an array): its push updates the value the closure captured
export function arrayResult(n: number) {
  const list: number[] = useList();
  list.push(n);
  return useCallback(() => list.length, [list]);
}
// a ref cell written during the render: a closure keyed by the captured value would read a stale cell
export function renderWrite(n: number) {
  const seen = useRef(0);
  seen.current = n;
  return useCallback(() => keep(seen.current), [n]);
}
// a ref cell written inside useMemo, which runs during the render: no function React holds, so no cell step
export function memoWrite(n: number) {
  const seen = useRef(0);
  const shown = useMemo(() => { seen.current = n; return n; }, [n]);
  return useCallback(() => keep(seen.current + shown), [shown]);
}
