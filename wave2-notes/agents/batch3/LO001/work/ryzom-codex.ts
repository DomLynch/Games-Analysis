// Licence: GNU AGPL v3 (repo COPYING; file headers say version 3 or later). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
type State = 0 | 1 | 2; // 0 hidden, 1 shown and not done, 2 shown and done
type Slot = number; // 0 = rite, 1..7 = tasks

// Two bits per slot, slots 0..7 packed into one 16-bit value.
class PackedSlots {
  private bits = 0;

  get(slot: Slot): State {
    return ((this.bits >> (slot * 2)) & 3) as State;
  }

  set(slot: Slot, s: State): void {
    this.bits = (this.bits & ~(3 << (slot * 2))) | (s << (slot * 2));
  }
}

interface ThemaSheet {
  id: string; // stable id (donor keys by array position; this is a fix)
  taskIds: string[]; // 0..7 task mission ids; the rite is slot 0 and not listed here
}

interface ThemaProgress {
  state: State;
  slots: PackedSlots;
}

class Codex {
  private progress = new Map<string, ThemaProgress>();

  constructor(private sheets: Map<string, ThemaSheet>) {
    // Donor only warns when a thema has more than 7 tasks; here it is refused at load.
    for (const s of sheets.values()) {
      if (s.taskIds.length > 7) throw new Error(`thema ${s.id} has more than 7 tasks`);
    }
  }

  private get(themaId: string): ThemaProgress {
    let p = this.progress.get(themaId);
    if (!p) {
      p = { state: 0, slots: new PackedSlots() };
      this.progress.set(themaId, p);
    }
    return p;
  }

  // Unlock: reveal the rite and every task of the thema (hidden to shown only; done stays done).
  unlockThema(themaId: string): void {
    const sheet = this.sheets.get(themaId);
    if (!sheet) return;
    const p = this.get(themaId);
    if (p.state === 0) p.state = 1;
    for (let slot = 0; slot <= sheet.taskIds.length; slot++) {
      if (p.slots.get(slot) === 0) p.slots.set(slot, 1);
    }
  }

  // A mission finished: set one slot. Returns false when refused.
  updateSlot(themaId: string, slot: Slot, next: State): boolean {
    const sheet = this.sheets.get(themaId);
    if (!sheet || slot > sheet.taskIds.length) return false; // donor does not check the slot against the sheet
    const p = this.get(themaId);
    if (p.state === 2 || p.slots.get(slot) === next) return false;
    p.slots.set(slot, next);
    if (p.state === 0) p.state = 1;
    if (p.slots.get(0) === 0) p.slots.set(0, 1); // the rite becomes visible once anything moves
    if (this.isThemaDone(themaId)) p.state = 2;
    return true;
  }

  // Donor rule: the rite (slot 0) and every sheet task must be state 2.
  private isThemaDone(themaId: string): boolean {
    const sheet = this.sheets.get(themaId);
    if (!sheet) return false;
    const p = this.get(themaId);
    for (let slot = 0; slot <= sheet.taskIds.length; slot++) {
      if (p.slots.get(slot) !== 2) return false;
    }
    return true;
  }
}

export {};
