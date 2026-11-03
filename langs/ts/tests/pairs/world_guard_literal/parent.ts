// A builder that keeps one record per node and stage in a cache it holds, looked up through its layers when it has any
// (a layer the node's record names, the nearest first). The fallback builder hands the base a name of its own choosing
class Builder {
  [key: string]: any;

  dataOf(node: any, stage: string, cache: any = null): any {
    cache = cache === null ? this.cache : cache;
    let data = cache.getData(node);
    if (data === undefined) {
      data = {};
      cache.setData(node, data);
    }
    if (data[stage] === undefined) data[stage] = {};
    let slot = data[stage];
    if (this.layers.length === 0) return slot;
    const layer = this.nearestLayer(data.any ? data.any.layers : null);
    if (layer) {
      if (slot.byLayer === undefined) slot.byLayer = {};
      slot = slot.byLayer[layer] || (slot.byLayer[layer] = {});
    }
    return slot;
  }

  // the nearest layer a source names: a node's own record (a call node's from its call), a list as it is
  nearestLayer(source: any): any {
    let list;
    if (source && source.isNode) {
      if (source.isCall) list = source.call.layers;
      else list = this.dataOf(source, "any").layers;
    } else {
      list = source;
    }
    if (!list) return null;
    const layers = this.layers;
    for (let i = list.length - 1; i >= 0; i--) {
      const layer = list[i];
      if (layers.includes(layer)) return layer;
    }
    return null;
  }

  uniformOf(node: any, type: string, stage: string, name: string | null = null): any {
    const data = this.dataOf(node, stage, this.globalCache);
    let uniform = data.uniform;
    if (uniform === undefined) {
      const index = this.uniforms.index++;
      uniform = { name: name || "u" + index, type, node };
      this.uniforms[stage].push(uniform);
      data.uniform = uniform;
    }
    return uniform;
  }
}

export class Fallback extends Builder {
  // a buffer's uniform is named by the base, any other by the caller's name; then its binding is made once per node,
  // by the kind of uniform: a texture, a buffer of its own, or a member of the group's shared block
  uniformOf(node: any, type: string, stage: string, name: string | null = null): any {
    const uniform = super.uniformOf(node, type, stage, type === "buffer" ? null : name);
    const data = this.dataOf(node, stage, this.globalCache);
    let binding = data.binding;
    if (binding === undefined) {
      const group = node.group;
      const bindings = this.bindingsOf(group.name, stage);
      if (type === "texture" || type === "cubeTexture") {
        binding = { kind: "sampler", name: uniform.name, group };
        bindings.push(binding);
      } else if (type === "storage") {
        binding = { kind: "storage", name: this.storageName(uniform), group };
        bindings.push(binding);
      } else {
        let block = this.blocks[group.name];
        if (block === undefined) {
          block = { name: group.name, members: [] };
          this.blocks[group.name] = block;
          bindings.push(block);
        } else if (bindings.indexOf(block) === -1) {
          bindings.push(block);
        }
        binding = { kind: "member", name: uniform.name, type };
        if (!block.members.some((m: any) => m.name === binding.name)) block.members.push(binding);
      }
      data.binding = binding;
    }
    return uniform;
  }
}
