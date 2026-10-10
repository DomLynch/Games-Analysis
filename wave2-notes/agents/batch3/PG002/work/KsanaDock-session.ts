// Licence: MIT (donor, LICENSE: "MIT License, Copyright (c) 2025 KsanaDock"). Shape adapted; written from the described mechanism, not a translation of the GDScript.
const CHAT_RANGE = 100;       // px, DialogService.gd 8

interface Actor { id: string; x: number; y: number; }
interface Session { id: string; a: string; b: string; active: boolean; }

class SessionRegistry {
  private sessions = new Map<string, Session>();
  private nextId = 0;
  constructor(private actors: Map<string, Actor>) {}

  private busy(id: string): boolean {
    for (const s of this.sessions.values()) {
      if (s.a === id || s.b === id) return true;
    }
    return false;
  }

  // Order as the donor runs it: both exist, in range, neither busy, then register.
  start(aId: string, bId: string): 'started' | 'refused:missing' | 'refused:range' | 'refused:busy' {
    const a = this.actors.get(aId);
    const b = this.actors.get(bId);
    if (a === undefined || b === undefined) return 'refused:missing';
    if (Math.hypot(a.x - b.x, a.y - b.y) > CHAT_RANGE) return 'refused:range';
    if (this.busy(aId) || this.busy(bId)) return 'refused:busy';
    const s: Session = { id: `s${this.nextId++}`, a: aId, b: bId, active: true };
    this.sessions.set(s.id, s);
    return 'started';
  }

  // End one session: flag it inactive, then remove it from the registry.
  end(sid: string): void {
    const s = this.sessions.get(sid);
    if (s === undefined || !s.active) return;
    s.active = false;
    this.sessions.delete(sid);
  }

  // End every session this actor is in (donor: end_character_conversations). Returns the count ended.
  endFor(id: string): number {
    const ids = [...this.sessions.values()].filter((s) => s.a === id || s.b === id).map((s) => s.id);
    for (const sid of ids) this.end(sid);
    return ids.length;
  }

  // Added, not in the donor: a failed reply releases the session so neither actor stays busy.
  replyFailed(sid: string): void {
    this.end(sid);
  }
}

export {};
