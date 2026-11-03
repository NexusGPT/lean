// A fallback on an answer of the world (exec/compared.mjs changedConversions, exec/search.mjs worldInfect, lane w9aj):
// the candidate writes `?? 0` where the parent writes `|| 0`. The two differ on a falsy answer that is not absent (NaN,
// "", false; 0 falls back to 0 either way); the package the answer comes from is faked, and its handle or its absence
// gives both versions the same depth. The world search sets the answer the changed conversion takes to each value of the
// fallback family; NaN tells them apart (the parent counts 0 - 1, the candidate NaN - 1).
import { registry } from "render-registry";
export class Renders {
  depthOf(scene: object): number {
    const d = (registry.get(scene) || 0) - 1;
    return d <= 0 ? 0 : d;
  }
}
