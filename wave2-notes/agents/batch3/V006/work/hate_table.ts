// Licence: LGPL-3.0 (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
interface Foe {
  id: number;
  visible: boolean;   // the NPC can see this foe
  dead: boolean;
  aggroMul: number;   // attacker-side percent, 100 = normal
}

interface Row { foe: Foe; damage: number; heal: number; }

class HateTable {
  private rows = new Map<number, Row>();

  constructor(private readonly incomingMul: number /* this NPC's percent, 100 = normal */) {}

  // Damage adds the scaled amount; heal adds 60 percent of it, truncated.
  add(kind: "damage" | "heal", foe: Foe, amount: number): void {
    let a = Math.trunc(amount * (foe.aggroMul / 100));
    a = Math.trunc(a * (this.incomingMul / 100));
    const row = this.rows.get(foe.id) ?? { foe, damage: 0, heal: 0 };
    if (kind === "damage") row.damage += a;
    else row.heal += Math.trunc(a * 0.6);
    this.rows.set(foe.id, row);
  }

  total(id: number): number {
    const r = this.rows.get(id);
    return r ? r.damage + r.heal : 0;
  }

  // Re-chosen every AI tick: the highest total that is visible and alive.
  // Entries that fail the test are dropped as the walk passes them.
  pickTarget(): Foe | null {
    const order = [...this.rows.values()].sort((x, y) => (y.damage + y.heal) - (x.damage + x.heal));
    for (const row of order) {
      if (row.foe.visible && !row.foe.dead) return row.foe;
      this.rows.delete(row.foe.id);
    }
    return null;
  }

  get size(): number { return this.rows.size; }
}

// Leash: return when the target is more than 50 away or the NPC is more than 50 from its idle spot,
// but only while the idle spot is within 200 (the donor returns false beyond that).
function shouldReturn(targetDist: number | null, idleDist: number): boolean {
  const RETURN = 50;
  const ABSOLUTE = 200;
  if (targetDist === null) return true;
  const res = targetDist > RETURN || idleDist > RETURN;
  return res ? idleDist <= ABSOLUTE : false;
}

export {};
