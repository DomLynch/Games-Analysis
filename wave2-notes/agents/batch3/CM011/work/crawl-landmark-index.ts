// Licence: GPL-2.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
type ServiceKind = 'shop' | 'altar' | 'portal' | 'stair';

interface Zone { branch: string; depth: number; }
interface Cell { zone: Zone; x: number; y: number; }
interface Landmark { kind: ServiceKind; label: string; }
interface Entry { cell: Cell; lm: Landmark; }

function sameZone(a: Zone, b: Zone): boolean {
  return a.branch === b.branch && a.depth === b.depth;
}

function zoneLess(a: Zone, b: Zone): boolean {
  return a.branch < b.branch || (a.branch === b.branch && a.depth < b.depth);
}

function cellKey(c: Cell): string {
  return `${c.zone.branch}:${c.zone.depth}:${c.x},${c.y}`;
}

class LandmarkIndex {
  private seen = new Map<string, Entry>();

  // Called when a cell comes into view. Non-landmark cells are not recorded.
  see(cell: Cell, lm: Landmark | null): void {
    if (lm === null) return;
    this.seen.set(cellKey(cell), { cell, lm }); // re-seeing overwrites with the current label
  }

  // Called when a landmark moves: the record is copied to the new cell, then the old cell is forgotten.
  move(from: Cell, to: Cell): boolean {
    const hit = this.seen.get(cellKey(from));
    if (!hit) return false;
    this.seen.set(cellKey(to), { cell: to, lm: hit.lm });
    this.forget(from);
    return true;
  }

  // Called when a landmark is destroyed or replaced by something else.
  forget(cell: Cell): void {
    this.seen.delete(cellKey(cell));
  }

  // Seen landmarks of one kind: zones in sorted order, cells in (y, x) order inside a zone.
  list(kind: ServiceKind): Array<{ zone: Zone; items: Entry[] }> {
    const rows = [...this.seen.values()]
      .filter((e) => e.lm.kind === kind)
      .sort((a, b) => {
        if (!sameZone(a.cell.zone, b.cell.zone)) {
          return zoneLess(a.cell.zone, b.cell.zone) ? -1 : 1;
        }
        return a.cell.y - b.cell.y || a.cell.x - b.cell.x;
      });
    const groups: Array<{ zone: Zone; items: Entry[] }> = [];
    for (const e of rows) {
      const last = groups[groups.length - 1];
      if (last !== undefined && sameZone(last.zone, e.cell.zone)) {
        last.items.push(e);
      } else {
        groups.push({ zone: e.cell.zone, items: [e] });
      }
    }
    return groups;
  }
}

export {};
