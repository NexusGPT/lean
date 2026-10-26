// expect: react-handler-capture
import { useCallback } from "react";
import { save } from "service";
export function changing(id: number) {
  let current = id;
  const handler = useCallback(() => save(current), [current]);
  current = id + 1;
  return handler;
}
