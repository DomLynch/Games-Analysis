// Licence: GPL-2.0 (donor, "version 2" in the file header; no "or later" stated). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
type TileState = "none" | "deleted" | "animated";
interface Tile { id: number; state: TileState; frame: number; }

const animated: Tile[] = [];

// Lazy removal: a delete only marks the tile; the next loop drops it. Re-adding a marked tile cancels the delete.
export function addAnimated(t: Tile): void {
  if (t.state === "animated") return;
  if (t.state === "none") animated.push(t); // "deleted" tiles are still in the list
  t.state = "animated";
}

export function deleteAnimated(t: Tile): void {
  if (t.state === "animated") t.state = "deleted";
}

// One pass per game loop. Dropped entries are replaced by the last entry (no shifting).
export function animateAll(step: (t: Tile) => void): void {
  let i = 0;
  while (i < animated.length) {
    const t = animated[i];
    if (t.state !== "animated") {
      t.state = "none";
      animated[i] = animated[animated.length - 1];
      animated.pop();
      continue; // re-check the entry that was moved into this slot
    }
    step(t);
    i++;
  }
}

// Speed gate on the shared game tick: advances when counter is a multiple of 2^speed (speed 0 = every tick).
export function speedGate(counter: number, speed: number): boolean {
  return counter % 2 ** speed === 0;
}

export interface AnimSpec { frames: number; looping: boolean; }
// Result of a callback or trigger: keep the normal step, delete the animation, or set the frame.
export type CbResult = { kind: "none" } | { kind: "delete" } | { kind: "frame"; frame: number };

// One frame step. The end of a non-looping clip removes the tile from the list.
export function stepFrame(t: Tile, spec: AnimSpec, cb: CbResult): void {
  if (cb.kind === "delete") { deleteAnimated(t); return; }
  if (cb.kind === "frame") { t.frame = cb.frame; return; }
  if (t.frame < spec.frames) t.frame++;
  else if (t.frame === spec.frames && spec.looping) t.frame = 0;
  else deleteAnimated(t);
}

// Stateless phase cycle keyed to the shared tick: a 2048-tick period; the animation runs in its upper half.
// Inside the window it steps every 8 ticks at the edges and every 4 ticks in the middle.
export function mineTowerDue(counter: number): { dir: "up" | "down"; step: boolean } | null {
  const local = (counter & 0x7ff) - 0x400;
  if (local < 0) return null;
  if (local < 0x1a0) {
    const mask = local < 0x20 || local >= 0x180 ? 7 : 3;
    return { dir: "up", step: (local & mask) === 0 };
  }
  if (local >= 0x200 && local < 0x3a0) {
    const mask = local < 0x220 || local >= 0x380 ? 7 : 3;
    return { dir: "down", step: (local & mask) === 0 };
  }
  return null;
}
