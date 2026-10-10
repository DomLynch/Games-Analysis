// Licence: Apache-2.0 (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
class PartySeats {
  private members: string[] = [];        // join order; index 0 is the oldest
  private reserved = new Set<string>();  // seats held while a join is being confirmed

  constructor(private readonly max: number) {}

  // Reservations count against the cap, like members do.
  size(): number { return this.members.length + this.reserved.size; }

  reserve(id: string): void {
    if (this.reserved.has(id)) return;                 // already holds a seat
    if (this.size() >= this.max) throw new Error("full");
    this.reserved.add(id);
  }

  release(id: string): void { this.reserved.delete(id); }

  // All or nothing: if the new ids do not fit, nothing changes.
  join(ids: string[]): void {
    const fresh = ids.filter(id => !this.reserved.has(id) && !this.members.includes(id)).length;
    if (fresh > 0 && this.size() + fresh > this.max) throw new Error("full");
    for (const id of ids) {
      this.reserved.delete(id);
      if (!this.members.includes(id)) this.members.push(id);
    }
  }

  // Returns the ids that were members. A reservation is dropped silently.
  leave(ids: string[]): string[] {
    const gone: string[] = [];
    for (const id of ids) {
      this.reserved.delete(id);
      const i = this.members.indexOf(id);
      if (i >= 0) { this.members.splice(i, 1); gone.push(id); }
    }
    return gone;
  }

  oldest(): string | undefined { return this.members[0]; }
}

// Accept a pending request: hold the seat, confirm with the stream, then join, or give the seat back.
async function accept(
  seats: PartySeats,
  requests: Set<string>,
  id: string,
  confirm: (id: string) => Promise<boolean>,
): Promise<"ok" | "not-requested" | "full" | "confirm-failed"> {
  if (!requests.has(id)) return "not-requested";
  try {
    seats.reserve(id);
  } catch {
    return "full";
  }
  requests.delete(id);
  const ok = await confirm(id);          // the seat stays held while this is pending
  if (!ok) {
    seats.release(id);
    return "confirm-failed";
  }
  seats.join([id]);
  return "ok";
}

// Leader leaves: the oldest remaining member takes over. With no members left the party closes.
function leaderAfterLeave(seats: PartySeats): string | undefined {
  return seats.oldest();
}

export {}
