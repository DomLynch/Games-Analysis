// Licence: Apache-2.0 (donor LICENSE.md). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export interface Layer {
  readonly material: number;   // id of the shader or texture this layer draws with
  visible: boolean;
  draw(): void;
}

export interface Item {
  visible: boolean;
  layers: (Layer | undefined)[];   // index = draw order inside one item; undefined = slot not in use
}

export interface RenderStats { drawn: number; materialSwitches: number; }

const scratch: Item[] = [];        // reused each frame; the donor allocates a fresh array on every draw

// Layer-major: every item's layer 0, then every item's layer 1, and so on.
// Draws that share a material end up next to each other.
export function drawLayerMajor(items: readonly Item[]): RenderStats {
  const stats: RenderStats = { drawn: 0, materialSwitches: 0 };
  scratch.length = 0;
  for (const it of items) if (it.visible) scratch.push(it);
  if (scratch.length === 0) return stats;

  // fix: the donor takes the layer count from the first visible item only, so a later item with more layers loses its extra layers. Use the maximum.
  let layerCount = 0;
  for (const it of scratch) if (it.layers.length > layerCount) layerCount = it.layers.length;

  let lastMaterial = -1;
  for (let i = 0; i < layerCount; i++) {
    for (const it of scratch) {
      const l = it.layers[i];
      if (!l || !l.visible) continue;
      if (l.material !== lastMaterial) { stats.materialSwitches++; lastMaterial = l.material; }
      l.draw();
      stats.drawn++;
    }
  }
  return stats;
}

// Item-major baseline, for comparing material switches: all layers of item 0, then item 1, and so on.
export function drawItemMajor(items: readonly Item[]): RenderStats {
  const stats: RenderStats = { drawn: 0, materialSwitches: 0 };
  let lastMaterial = -1;
  for (const it of items) {
    if (!it.visible) continue;
    for (const l of it.layers) {
      if (!l || !l.visible) continue;
      if (l.material !== lastMaterial) { stats.materialSwitches++; lastMaterial = l.material; }
      l.draw();
      stats.drawn++;
    }
  }
  return stats;
}

export {};
