// Licence: GPL-3.0 (OpenDAoC LICENSE, Version 3). Clean-room sketch from the described mechanism; no donor line is translated.
// clean-room
const STATUS = { dead: 0x01, mezzed: 0x02, diseased: 0x04, poisoned: 0x08, linkdead: 0x10, otherRegion: 0x20 } as const;

interface Member {
  id: number;
  groupIndex: number;          // 1..8
  region: number;
  health: number;
  maxHealth: number;
  mana: number;
  maxMana: number;
  mezzed: boolean;
  diseased: boolean;
  poisoned: boolean;
  linkdead: boolean;
  pet?: { health: number; maxHealth: number };   // a pet the member drives; the group frame shows its health
}

interface Frame { id: number; groupIndex: number; healthPct: number; manaPct: number; status: number; }

// Percent clamped to 0..100; 0 when the maximum is 0.
function pct(cur: number, max: number): number {
  if (max <= 0) return 0;
  return Math.min(100, Math.max(0, Math.floor((cur * 100) / max)));
}

// Frame derived from current state. Called once per tick, never from a setter.
function frameFor(m: Member, viewerRegion: number): Frame {
  if (m.region !== viewerRegion) {
    return { id: m.id, groupIndex: m.groupIndex, healthPct: 0, manaPct: 0, status: STATUS.otherRegion };
  }
  const healthPct = m.pet ? pct(m.pet.health, m.pet.maxHealth) : pct(m.health, m.maxHealth);
  let status = 0;
  if (m.health <= 0) status |= STATUS.dead;
  if (m.mezzed) status |= STATUS.mezzed;
  if (m.diseased) status |= STATUS.diseased;
  if (m.poisoned) status |= STATUS.poisoned;
  if (m.linkdead) status |= STATUS.linkdead;
  return { id: m.id, groupIndex: m.groupIndex, healthPct, manaPct: pct(m.mana, m.maxMana), status };
}

// Per viewer, once per tick: returns only the frames that differ from what this viewer last received.
// The caller sends the returned list as one packet per viewer.
class FrameFeed {
  private sent = new Map<string, string>();

  tick(viewer: { id: number; region: number }, group: Member[]): Frame[] {
    const out: Frame[] = [];
    for (const m of group) {
      const f = frameFor(m, viewer.region);
      const key = `${viewer.id}:${m.id}`;
      const sig = `${f.healthPct}|${f.manaPct}|${f.status}`;
      if (this.sent.get(key) === sig) continue;
      this.sent.set(key, sig);
      out.push(f);
    }
    return out;
  }
}

// Target frame: the combat event carries the defender's health percent; a value above 100 means
// "not valid", so the live value is read instead.
function combatTargetPct(defender: { health: number; maxHealth: number }, sentPct: number): number {
  return sentPct > 100 ? pct(defender.health, defender.maxHealth) : sentPct;
}

export {};
