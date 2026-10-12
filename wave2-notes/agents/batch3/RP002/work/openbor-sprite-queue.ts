// Licence: BSD-3-Clause (donor, permissive). Clean-room sketch of the queue rules: capped add with counted drops, order by z then sortid then insertion, z-band draw, and a locked base layer kept across clear.
// clean-room
interface Item { z: number; sortid: number; seq: number; draw: () => void }

const QUEUE_CAP = 5000; // donor MAXQSPRITES; the donor drops silently when full, this sketch counts the drops

class SpriteQueue {
  private items: Item[] = [];
  private locked = false;
  private frozenLen = 0;   // items [0, frozenLen) are the locked base layer
  dropped = 0;             // clamp-and-report: how many adds did not fit this frame

  add(z: number, sortid: number, draw: () => void): void {
    if (this.items.length >= QUEUE_CAP) { this.dropped++; return; }
    this.items.push({ z, sortid, seq: this.items.length, draw });
  }

  // Freeze what is queued now as the base layer; later clear() calls keep it.
  lock(): void {
    this.frozenLen = this.items.length;
    this.locked = true;
  }

  unlock(): void {
    this.locked = false;
  }

  // Per frame: a locked queue keeps its base layer and drops only the new items.
  clear(): void {
    this.items.length = this.locked ? this.frozenLen : 0;
  }

  // Draw in (z, sortid, insertion) order, skipping items outside the z band [minZ, maxZ].
  draw(minZ: number, maxZ: number): void {
    const order = this.items.slice().sort((a, b) => a.z - b.z || a.sortid - b.sortid || a.seq - b.seq);
    for (const it of order) {
      if (it.z < minZ || it.z > maxZ) continue;
      it.draw();
    }
  }
}
