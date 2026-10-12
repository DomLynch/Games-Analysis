// Licence: restricted (ID Software Limited Use Software License Agreement, README.rst line 89). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
const TICK_HZ = 70;   // one tic = 1/70 s
const MAX_TICS = 10;  // a frame never advances more than this many tics; the excess time is dropped

// Health portrait: 7 health bands, 3 idle frames per band, and a dead face that depends on the killer.
type KillerKind = 'needle' | 'other';
type Portrait =
  | { kind: 'alive'; band: number; frame: number }
  | { kind: 'dead'; killer: KillerKind };

interface PortraitState { health: number; frame: number; sinceChange: number; killer: KillerKind; }

// Band from health: (100 - health) / 16 with integer division. Health 1..100 gives band 0..6 (0 = 85..100, 6 = 1..4).
function healthBand(health: number): number {
  return Math.floor((100 - health) / 16);
}

function portraitFor(s: PortraitState): Portrait {
  if (s.health <= 0) return { kind: 'dead', killer: s.killer };
  return { kind: 'alive', band: healthBand(s.health), frame: s.frame };
}

// Fixed 256-entry tape: the donor draws its random values from a table, so the sequence repeats and a replay can match it.
function tapeReader(table: readonly number[]): () => number {
  let i = 0;
  return () => {
    const v = table[i];
    i = (i + 1) & 255;
    return v;
  };
}

// Once per frame. The idle frame changes when the tics since the last change exceed a fresh draw.
// Fix: the donor folds a draw of 3 into frame 1, so frame 1 is twice as likely; here the draw is taken modulo 3.
function idleTick(s: PortraitState, tics: number, tape: () => number, holdIdle: boolean): boolean {
  if (holdIdle) return false; // donor: no idle change while the gatling sound plays
  s.sinceChange += tics;
  if (s.sinceChange <= tape()) return false;
  s.frame = tape() % 3;
  s.sinceChange = 0;
  return true;
}

// A hit. The attacker is recorded before the godmode check (donor order); baby difficulty quarters the damage.
function takeHit(s: PortraitState, points: number, attacker: KillerKind, godmode: boolean, baby: boolean): void {
  s.killer = attacker;
  const dmg = baby ? points >> 2 : points;
  if (!godmode) s.health -= dmg;
  if (s.health < 0) s.health = 0;
}

// Damage tint: the meter rises by each hit and drains by the tics elapsed. The red step is 1 + count/10, capped at 6.
interface TintState { damageCount: number; }
const MAX_RED_STEP = 6;

function addDamage(t: TintState, points: number): void {
  t.damageCount += points;
}

// Read the step first, then drain (donor order), so the frame that takes the hit shows its full step.
function tintStep(t: TintState, tics: number): number {
  const step = t.damageCount > 0 ? Math.min(MAX_RED_STEP, Math.floor(t.damageCount / 10) + 1) : 0;
  t.damageCount = Math.max(0, t.damageCount - tics);
  return step;
}

export {};

