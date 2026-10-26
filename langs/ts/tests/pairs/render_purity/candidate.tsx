import React, { useState } from "react";
// A render is pure: the same props and state give the same tree. Lane B renders every component twice from the
// same state (Strict Mode's rule) and refuses a component whose two renders differ, on either side.
export function Clocked({ label }: { label: string }) {
  return <p>{label} at {Date.now()}!</p>;
}
export function Stamped({ label }: { label: string }) {
  const [count] = useState(0);
  const stamp = new Date().getTime();
  return <p>{label} {count} {stamp}</p>;
}
export function Pure({ label }: { label: string }) {
  const [count] = useState(0);
  return <p>{label} {count}</p>;
}
