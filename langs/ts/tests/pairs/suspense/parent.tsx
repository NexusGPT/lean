import React, { use, useState } from "react";
// A component that suspends on a promise prop: React shows the nearest fallback and retries when it settles.
// lean has no model of that schedule, so the run is ASK with the reason, never a WITNESS or a PASS.
export function Lazy({ data }: { data: Promise<string> }) {
  const value = use(data);
  return <p>{value}</p>;
}
// The throw-a-thenable form of older data libraries: the same answer.
export function Thrown({ load }: { load: () => Promise<string> }) {
  const [value] = useState<string | undefined>(undefined);
  if (value === undefined) throw load();
  return <p>{value}</p>;
}
// A plain component beside them: unaffected.
export function Plain({ text }: { text: string }) {
  return <p>{text}</p>;
}
