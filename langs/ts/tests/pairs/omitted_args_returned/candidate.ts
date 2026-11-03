// a unit that hands out a lookup whose second parameter has a default: a state per scene, one per call depth
export function makeStates() {
  const states = new WeakMap<object, { id: number }[]>();
  let made = 0;
  function get(scene: object, depth = 1) {
    const list = states.get(scene);
    if (list === undefined) {
      const fresh = { id: ++made };
      states.set(scene, [fresh]);
      return fresh;
    }
    if (depth >= list.length) {
      const fresh = { id: ++made };
      list.push(fresh);
      return fresh;
    }
    return list[depth];
  }
  return { get };
}
