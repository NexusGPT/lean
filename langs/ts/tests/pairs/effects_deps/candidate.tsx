import React, { useEffect, useState } from "react";
import { subscribe, unsubscribe } from "feed";
// An effect with a dependency: when the id changes, React cleans up the old subscription and makes the new one.
export function Feed({ start }: { start: number }) {
  const [id, setId] = useState(start);
  useEffect(() => { subscribe(id); return () => unsubscribe(id); }, [id]);
  return (
    <div>
      <button onClick={() => setId(start + 1)}>next</button>
      <p>{id}</p>
    </div>
  );
}
// The same component, untouched on both sides.
export function Stable({ start }: { start: number }) {
  const [id, setId] = useState(start);
  useEffect(() => { subscribe(id); return () => unsubscribe(id); }, [id]);
  return <button onClick={() => setId(id + 1)}>{id}</button>;
}
