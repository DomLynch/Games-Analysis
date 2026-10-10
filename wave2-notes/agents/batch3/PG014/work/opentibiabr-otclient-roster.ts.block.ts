// Licence: MIT (donor). Clean-room sketch written from the described mechanism; not a translation.
type PartyStatus = 'none' | 'member' | 'leader';

interface RosterEntry { id: number; name: string; status: PartyStatus; }

// Leading-edge plus one trailing refresh per debounce window.
class RosterRefresher {
  private pending = false;
  private lastRun = Number.NEGATIVE_INFINITY;

  constructor(
    private readonly debounceMs: number,
    private readonly run: () => void,
    private readonly now: () => number,
    private readonly later: (fn: () => void, ms: number) => void,
  ) {}

  request(): void {
    if (this.pending) return;                 // a trailing run is queued and will read the latest state
    const elapsed = this.now() - this.lastRun;
    if (elapsed < this.debounceMs) {
      this.pending = true;
      this.later(() => this.flush(), this.debounceMs - elapsed);
    } else {
      this.flush();
    }
  }

  private flush(): void {
    this.pending = false;
    this.lastRun = this.now();
    this.run();
  }
}

// The roster follows the server's party list. Anyone who is no longer in it is removed,
// including members out of view (the donor keeps those).
function reconcile(roster: Map<number, RosterEntry>, serverMembers: RosterEntry[]): void {
  const live = new Set(serverMembers.map(m => m.id));
  for (const id of Array.from(roster.keys())) {
    if (!live.has(id)) roster.delete(id);
  }
  for (const m of serverMembers) roster.set(m.id, m);
}

export {};
