// Licence: AGPL-3.0 (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
type XpLedger = Map<string, number>;

interface Unlock { xpType: string; xpCap: number; } // one per owned skill box; xpCap 0 means the box sets no cap

interface SkillBox {
  name: string;
  xpType: string;
  xpCost: number;          // XP spent to learn
  pointsRequired: number;  // skill points spent to learn, refunded on surrender
  requires: string[];      // prerequisite box names
}

interface Character {
  skills: Set<string>;
  points: number;
  xp: XpLedger;
}

interface Multipliers { species: number; buff: number; local: number; global: number; }

const DEFAULT_CAP = 2000; // used when no owned box and no default table entry names the type

// Cap table is rebuilt from the owned boxes (max cap per type), then defaults fill the gaps.
function rebuildCaps(owned: Unlock[], defaults: Map<string, number>): Map<string, number> {
  const caps = new Map<string, number>();
  for (const u of owned) {
    if (u.xpCap === 0) continue;
    caps.set(u.xpType, Math.max(caps.get(u.xpType) ?? 0, u.xpCap));
  }
  for (const [t, v] of defaults) if (!caps.has(t)) caps.set(t, v);
  return caps;
}

function capOf(caps: Map<string, number>, xpType: string): number {
  if (xpType.startsWith("prestige_")) return Infinity;
  return caps.get(xpType) ?? DEFAULT_CAP;
}

// One ledger write. Returns the amount actually added after the cap (can be negative if already above a lowered cap).
function addExperience(ledger: XpLedger, caps: Map<string, number>, xpType: string, gain: number): number {
  if (gain === 0) return 0;
  const before = ledger.get(xpType) ?? 0;
  let total = before + gain;
  if (ledger.has(xpType) && total <= 0 && xpType !== "jedi_general") {
    ledger.delete(xpType); // a type that reaches zero or below is dropped entirely
    return 0;
  }
  const cap = capOf(caps, xpType);
  if (total > cap) total = cap;
  ledger.set(xpType, total);
  return total - before;
}

// Award: with modifiers, the raw amount is scaled by species, buff, local and global multipliers, then truncated, then capped.
function awardExperience(ledger: XpLedger, caps: Map<string, number>, xpType: string, amount: number, m: Multipliers | null): number {
  // m === null is the donor's applyModifiers=false path: the raw amount is added.
  const scaled = m === null ? Math.trunc(amount) : Math.trunc(amount * m.species * m.buff * m.local * m.global);
  return addExperience(ledger, caps, xpType, scaled);
}

function canLearn(box: SkillBox, ch: Character): boolean {
  if (ch.skills.has(box.name)) return false;
  if (!box.requires.every((r) => ch.skills.has(r))) return false;
  if ((ch.xp.get(box.xpType) ?? 0) < box.xpCost) return false;
  return ch.points >= box.pointsRequired;
}

// Learn: points spent first, then XP, then the box is added. Caller rebuilds caps afterwards.
function learn(box: SkillBox, ch: Character, caps: Map<string, number>): boolean {
  if (!canLearn(box, ch)) return false;
  ch.points -= box.pointsRequired;
  addExperience(ch.xp, caps, box.xpType, -box.xpCost);
  ch.skills.add(box.name);
  return true;
}

// Surrender: points come back, XP does not.
function surrender(box: SkillBox, ch: Character): boolean {
  if (!ch.skills.has(box.name)) return true;
  ch.skills.delete(box.name);
  ch.points += box.pointsRequired;
  return true;
}

// After any learn or surrender: lower caps clamp existing XP (a clamp can only reduce a type to its new cap).
function clampToCaps(ledger: XpLedger, caps: Map<string, number>): void {
  for (const [t, v] of ledger) {
    const c = capOf(caps, t);
    if (v > c) addExperience(ledger, caps, t, c - v);
  }
}

export {};
