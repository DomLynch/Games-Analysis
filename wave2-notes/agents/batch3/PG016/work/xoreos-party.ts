// Licence: GPL-3.0 (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
type Id = number;
interface Vec3 { x: number; y: number; z: number }
interface Member { id: Id; pos: Vec3; controllable: boolean; actions: string[] }

// Roster: index 0 is the controlled leader; companions follow in list order.
class Roster {
  private list: Member[] = [];
  constructor(private onLeaderChanged: () => void) {}

  get leader(): Member | undefined { return this.list[0]; }

  // A new member appears on the leader's position and joins the back of the list.
  add(id: Id): void {
    const lead = this.list[0];
    const pos = lead ? { ...lead.pos } : { x: 0, y: 0, z: 0 };
    this.list.push({ id, pos, controllable: true, actions: [] });
  }

  // Rotate the roster left by `index` steps; the old leader ends up at the back.
  setLeaderByIndex(index: number): void {
    if (index === 0 || this.list.length === 0) return; // empty guard added: donor has none
    const prev = this.list[0];
    for (let i = 0; i < index; i++) this.list.push(this.list.shift()!);
    const next = this.list[0];
    prev.controllable = true;
    next.controllable = false;
    next.actions = [];
    this.onLeaderChanged();
  }

  // A named companion becomes leader; ids not in the roster are ignored.
  setLeaderById(id: Id): void {
    const i = this.list.findIndex((m, k) => k >= 1 && m.id === id);
    if (i === -1) return;
    this.setLeaderByIndex(i);
  }

  // Tab: cycle to the next member on key release, not on press.
  onCycleKey(released: boolean): void {
    if (released && this.list.length > 0) this.setLeaderByIndex(1);
  }

  // Every member gets a heartbeat tick, leader included.
  heartbeat(tick: (m: Member) => void): void {
    for (const m of this.list) tick(m);
  }
}

const SLOT_CAP = 2; // donor: at most two companions are chosen; forced slots count toward it

class PartySelection {
  private selected: boolean[];
  private count = 0;

  constructor(private slots: (string | null)[], private forced: number[] = []) {
    this.selected = slots.map(() => false);
    for (const f of forced) {
      if (!this.selected[f]) { this.selected[f] = true; this.count++; }
    }
  }

  // Accept on the active slot. Forced slots never change. A bad index or an empty slot is ignored (added guards).
  toggle(active: number): void {
    if (active < 0 || active >= this.slots.length) return;
    if (this.slots[active] === null || this.forced.includes(active)) return;
    if (!this.selected[active]) {
      if (this.count < SLOT_CAP) { this.selected[active] = true; this.count++; }
    } else {
      this.selected[active] = false;
      this.count--;
    }
  }

  remaining(): number { return SLOT_CAP - this.count; }
}

export {};
