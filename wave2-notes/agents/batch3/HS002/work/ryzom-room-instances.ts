// Licence: AGPL-3.0 (donor). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
interface RoomInstance {
  roomIdx: number;
  ownerIdx: number;
  refCount: number; // number of visitors inside
}

// One building: rooms x owners. A cell is 0 until the first visitor arrives, then holds pool index + 1.
class BuildingInstancer {
  private cells: number[][];
  private pool: (RoomInstance | null)[] = [];
  private free: number[] = [];
  stateCounter = 0; // bumped whenever an owner or room set changes

  constructor(roomCount: number, ownerCount: number) {
    this.cells = Array.from({ length: roomCount }, () => new Array<number>(ownerCount).fill(0));
  }

  // Visitor enters room roomIdx of owner ownerIdx; the instance is created on first visit.
  enter(roomIdx: number, ownerIdx: number): number | null {
    if (roomIdx >= this.cells.length || ownerIdx >= this.cells[roomIdx].length) return null;
    if (this.cells[roomIdx][ownerIdx] === 0) {
      const idx = this.free.length > 0 ? (this.free.pop() as number) : this.pool.push(null) - 1;
      this.pool[idx] = { roomIdx, ownerIdx, refCount: 0 };
      this.cells[roomIdx][ownerIdx] = idx + 1;
    }
    const inst = this.pool[this.cells[roomIdx][ownerIdx] - 1];
    if (!inst) return null;
    inst.refCount += 1;
    return this.cells[roomIdx][ownerIdx] - 1;
  }

  // Visitor leaves. The cell is reset by the room's OWNER index (not by the leaver's id), so the last
  // visitor can be anyone. The instance is released when the last visitor leaves.
  leave(poolIdx: number): void {
    const inst = this.pool[poolIdx];
    if (!inst) return;
    inst.refCount -= 1;
    if (inst.refCount === 0) {
      this.cells[inst.roomIdx][inst.ownerIdx] = 0;
      this.pool[poolIdx] = null;
      this.free.push(poolIdx);
    }
  }

  // Session token for a menu: sum of state counters, kept to 16 bits like the donor.
  sessionToken(counters: number[]): number {
    let s = 0;
    for (const c of counters) s = (s + c) & 0xffff;
    return s;
  }

  // A choice from a lift-style menu is valid only if the building state has not changed since the menu was built.
  choiceIsFresh(offeredSession: number, counters: number[]): boolean {
    return this.sessionToken(counters) === offeredSession;
  }
}

export {};
