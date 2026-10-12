// Licence: zlib-style notice (donor teeworlds-teeworlds, license.txt). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
export {};

export const TICKS_PER_SECOND = 50;                 // donor SERVER_TICK_SPEED = 50; one tick = 20 ms
export const PAYLOAD_BYTES = 900;                   // donor MAX_SNAPSHOT_PACKSIZE = 900
export const HISTORY_TICKS = 3 * TICKS_PER_SECOND;  // donor keeps 3 s of snapshots per client
export const ITEM_CAP = 1024;                       // donor CSnapshotBuilder MAX_ITEMS

export enum SnapRate { INIT = 0, FULL = 1, RECOVER = 2 }

export interface Viewer {
  snapRate: SnapRate;
  lastAckedTick: number; // -1 when nothing acknowledged yet
  viewX: number;
  viewY: number;
}

// Donor gate (server.cpp 529-533). The caller only runs this on snap ticks (even ticks, server.cpp 1387).
export function dueOnSnapTick(v: Viewer, tick: number): boolean {
  if (v.snapRate === SnapRate.RECOVER) return tick % TICKS_PER_SECOND === 0; // once per second
  if (v.snapRate === SnapRate.INIT) return tick % 10 === 0;                  // every 10 ticks until first ack
  return true;                                                               // FULL
}

// Donor 921-922: a positive ack moves the client to FULL and becomes the delta base.
export function onAck(v: Viewer, ackedTick: number): void {
  v.lastAckedTick = ackedTick;
  if (ackedTick > 0) v.snapRate = SnapRate.FULL;
}

// Donor 574-575: a FULL client with no usable base falls back to RECOVER.
export function onNoBase(v: Viewer): void {
  if (v.snapRate === SnapRate.FULL) v.snapRate = SnapRate.RECOVER;
}

// Donor NetworkClipped (entity.cpp 40-47): a box of +-1000 by +-800 around the viewer, then a 1100 radius circle.
export function clipped(v: Viewer, x: number, y: number): boolean {
  const dx = v.viewX - x;
  const dy = v.viewY - y;
  if (Math.abs(dx) > 1000 || Math.abs(dy) > 800) return true;
  return Math.hypot(dx, dy) > 1100;
}

// Donor DiffItem (snapshot.cpp 139-153): per-int subtraction; the item is sent only if any int differs.
export function diffItem(past: number[], cur: number[]): { changed: boolean; diff: number[] } {
  let needed = 0;
  const diff = cur.map((value, i) => {
    const d = value - past[i];
    needed |= d;
    return d;
  });
  return { changed: needed !== 0, diff };
}

// Donor 586-590: the compressed delta is cut into payload-sized packets.
export function chunk(bytes: Uint8Array, payload: number = PAYLOAD_BYTES): Uint8Array[] {
  const out: Uint8Array[] = [];
  for (let off = 0; off < bytes.length; off += payload) {
    out.push(bytes.subarray(off, Math.min(off + payload, bytes.length)));
  }
  return out;
}

// Fix for the donor's silent drop (snapshot.cpp 651-668 returns null when full): count the drop and report it.
export class ItemBudget {
  private items = 0;
  dropped = 0;

  tryAdd(bytes: number, maxBytes: number, used: number): boolean {
    if (this.items + 1 > ITEM_CAP || used + bytes > maxBytes) {
      this.dropped++;
      return false;
    }
    this.items++;
    return true;
  }
}
