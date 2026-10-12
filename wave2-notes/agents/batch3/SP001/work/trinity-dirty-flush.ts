// Licence: GPL-2.0-or-later (donor source headers; COPYING is version 2). clean-room: written from the described mechanism, not a translation of the donor lines.
// clean-room
export interface Fighter {
  id: number;
  x: number;
  y: number;
  range: number;                 // visibility distance for this fighter type, units
  fields: Map<string, number>;
  changed: Set<string>;          // fields changed since the last flush
  queued: boolean;               // already in the dirty set this tick
}

export interface Viewer {
  id: number;
  x: number;
  y: number;
  known: Set<number>;            // fighter ids this viewer already has a copy of
}

export interface Delta { id: number; fields: Record<string, number> }

export class SnapshotHub {
  private dirty = new Set<Fighter>();

  // Write-time check: only a real change marks the field and queues the fighter once.
  set(f: Fighter, field: string, value: number): void {
    if (f.fields.get(field) === value) return;
    f.fields.set(field, value);
    f.changed.add(field);
    if (!f.queued) {
      f.queued = true;
      this.dirty.add(f);
    }
  }

  // Once per server tick: build one delta list per viewer, changed fields only, then clear.
  flush(viewers: Viewer[]): Map<number, Delta[]> {
    const out = new Map<number, Delta[]>();
    for (const f of this.dirty) {
      const fields: Record<string, number> = {};
      for (const name of f.changed) fields[name] = f.fields.get(name) as number;
      for (const v of viewers) {
        if (!v.known.has(f.id)) continue;                  // no copy yet: a create message is sent elsewhere
        if (Math.hypot(v.x - f.x, v.y - f.y) > f.range) continue;
        let list = out.get(v.id);
        if (list === undefined) {
          list = [];
          out.set(v.id, list);
        }
        list.push({ id: f.id, fields: { ...fields } });
      }
      f.changed.clear();
      f.queued = false;
    }
    this.dirty.clear();
    return out;
  }
}
