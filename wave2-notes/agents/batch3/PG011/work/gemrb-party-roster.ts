// Licence: GPL-2.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
interface Member { id: string; slot: number; } // slot is 1-based, as the donor's InParty

type JoinResult = { ok: true; slot: number } | { ok: false; reason: "already-in" | "full" };

class PartyRoster {
  private members: Member[] = []; // kept in slot order

  constructor(private readonly cap: number) {} // cap 0 = no limit

  // Join appends at the next free slot. Over-cap joins are refused here, not flagged afterwards.
  join(id: string): JoinResult {
    if (this.members.some(m => m.id === id)) return { ok: false, reason: "already-in" };
    if (this.cap > 0 && this.members.length >= this.cap) return { ok: false, reason: "full" };
    const slot = this.members.length + 1;
    this.members.push({ id, slot });
    return { ok: true, slot };
  }

  // Leave removes the member, then moves every higher slot down by one so no gap is left.
  leave(id: string): boolean {
    const idx = this.members.findIndex(m => m.id === id);
    if (idx < 0) return false;
    const gone = this.members[idx];
    this.members.splice(idx, 1);
    for (const m of this.members) if (m.slot > gone.slot) m.slot -= 1;
    return true;
  }

  // On load, stored slots may have gaps: sort by slot and renumber 1..n.
  consolidate(): void {
    this.members.sort((a, b) => a.slot - b.slot);
    this.members.forEach((m, i) => { m.slot = i + 1; });
  }

  slotOf(id: string): number | undefined {
    return this.members.find(m => m.id === id)?.slot;
  }

  size(): number { return this.members.length; }
}

export {}
