// Licence: GPL-3.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
interface Item {
  program: number;
  material: number;
  mesh: number;
  surface: number;
  transparent: boolean;
  distSq: number;     // squared distance from the camera, computed when queued
  alpha: number;
}

// Opaque order: fewest state changes first (program, then material, then mesh, then surface).
// Fix over the donor: surface is part of the key, and the comparator is a strict total order.
function stateCmp(a: Item, b: Item): number {
  if (a.program !== b.program) return a.program - b.program;
  if (a.material !== b.material) return a.material - b.material;
  if (a.mesh !== b.mesh) return a.mesh - b.mesh;
  return a.surface - b.surface;
}

// Opaque items in state order; transparent items far to near (fix: the donor sorts them nearest first).
export function orderQueue(items: Item[]): { opaque: Item[]; transparent: Item[] } {
  const opaque = items.filter((i) => !i.transparent).sort(stateCmp);
  const transparent = items.filter((i) => i.transparent).sort((a, b) => b.distSq - a.distSq);
  return { opaque, transparent };
}

// Counts the state changes a draw list would cause. The donor draws one call per item (no instancing).
export function countChanges(list: Item[]): { programSwitches: number; meshBinds: number; draws: number } {
  let programSwitches = 0;
  let meshBinds = 0;
  let prog = -1;
  let mesh = -1;
  let surf = -1;
  for (const it of list) {
    if (it.program !== prog) { prog = it.program; programSwitches++; }
    if (it.mesh !== mesh || it.surface !== surf) { mesh = it.mesh; surf = it.surface; meshBinds++; }
  }
  return { programSwitches, meshBinds, draws: list.length };
}

// Frame-pacing budget (fix: the donor uploads every queued texture in one frame, with no cap).
export function takeUploads<T>(pending: T[], perFrame: number): { now: T[]; later: T[] } {
  return { now: pending.slice(0, perFrame), later: pending.slice(perFrame) };
}

export {};
