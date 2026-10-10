// Clean-room sketch: join-time seat assignment with a friend-only gate and rejoin seat memory.
// Donor licence: GPL version 2 or later (0 A.D. LICENSE.txt, binaries/data/). Written from the described mechanism, not translated.
// clean-room
type JoinPolicy = "everyone" | "friends" | "disabled";

class SeatBook {
  private seatOf = new Map<string, number>();   // account -> seat it holds now
  private lastSeat = new Map<string, number>(); // account -> last seat > 0 it held; kept after leave

  constructor(private seatCount: number, private policy: JoinPolicy) {}

  // Returns the seat for a joiner, or null when they stay a spectator.
  onJoin(accountId: string, isFriend: boolean): number | null {
    if (this.policy === "disabled") return null;
    if (this.policy === "friends" && !isFriend) return null;
    if (this.seatOf.has(accountId)) return this.seatOf.get(accountId)!;

    const taken = new Set(this.seatOf.values());
    let seat: number | undefined;

    // Rejoin: take the old seat if it is in range and free right now.
    const old = this.lastSeat.get(accountId) ?? 0;
    if (old > 0 && old <= this.seatCount && !taken.has(old)) seat = old;

    // Otherwise the lowest free seat.
    if (seat === undefined) {
      for (let s = 1; s <= this.seatCount; s++) {
        if (!taken.has(s)) { seat = s; break; }
      }
    }
    if (seat === undefined) return null;

    this.seatOf.set(accountId, seat);
    this.lastSeat.set(accountId, seat);
    return seat;
  }

  // The seat is freed, but the memory of it stays (the donor keeps lastAssigned when a name leaves the list).
  onLeave(accountId: string): void {
    this.seatOf.delete(accountId);
  }
}

export {};
