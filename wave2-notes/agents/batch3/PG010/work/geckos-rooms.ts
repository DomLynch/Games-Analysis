// Licence: BSD-3-Clause (donor). Clean-room sketch of the shape: one room per connection, room and broadcast fan-out, repeat-send reliable events with a receiver-side dedupe window. Not a translation.
export {};

type RoomId = string | undefined;
type Inbox = (event: string, data: unknown, from?: string) => void;

interface Conn {
  id: string;
  room: RoomId;
  inbox: Inbox;
}

const REPEAT_RUNS = 10;     // donor default: makeReliable runs
const REPEAT_MS = 150;      // donor default: makeReliable interval
const DEDUPE_MS = 15_000;   // donor: a receiver keeps reliable ids for 15 s

// Send offsets for one reliable event: one send now, then one per interval (runs in total).
function repeatOffsets(runs: number = REPEAT_RUNS, intervalMs: number = REPEAT_MS): number[] {
  const out: number[] = [];
  for (let k = 0; k < runs; k++) out.push(k * intervalMs);
  return out;
}

// Receiver side: a repeated message is accepted once per id inside the window.
class Dedupe {
  private seen: { id: string; expire: number }[] = [];

  accept(id: string, now: number): boolean {
    this.seen = this.seen.filter((s) => s.expire > now); // prune every expired entry at once
    if (this.seen.some((s) => s.id === id)) return false;
    this.seen.push({ id, expire: now + DEDUPE_MS });
    return true;
  }
}

class Hub {
  private conns = new Map<string, Conn>();

  add(c: Conn): void { this.conns.set(c.id, c); }
  remove(id: string): void { this.conns.delete(id); }
  join(id: string, room: RoomId): void {
    const c = this.conns.get(id);
    if (c) c.room = room;
  }
  leave(id: string): void { this.join(id, undefined); }

  // Donor room.emit: everyone whose room equals `room` (the donor passes the sender's own room), sender included.
  roomEmit(room: RoomId, event: string, data: unknown): void {
    for (const c of this.conns.values()) if (c.room === room) c.inbox(event, data);
  }

  // Donor broadcast.emit: everyone in the sender's room except the sender.
  broadcast(senderId: string, event: string, data: unknown): void {
    const s = this.conns.get(senderId);
    if (!s) return;
    for (const c of this.conns.values()) {
      if (c.room === s.room && c.id !== senderId) c.inbox(event, data, senderId);
    }
  }
}

// Usage: a party of two (a and b) and a third player (c) who is not in it.
const hub = new Hub();
const got: string[] = [];
const mk = (id: string): Conn => ({ id, room: undefined, inbox: (ev, d) => { got.push(`${id}:${ev}:${String(d)}`); } });
hub.add(mk("a"));
hub.add(mk("b"));
hub.add(mk("c"));
hub.join("a", "party-1");
hub.join("b", "party-1");
hub.broadcast("a", "party chat", "hi");        // b only
hub.roomEmit("party-1", "party state", "x");    // a and b
console.log(got, repeatOffsets(), new Dedupe().accept("id1", 0));
