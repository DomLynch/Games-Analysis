// Donor licence: GPL (OpenDAoC LICENSE is GPL-3.0; source header gplheader.txt is GPL-2.0-or-later). Clean-room sketch from the described mechanism, not a translation of the donor lines.
// Adapted: the donor keys immunity on (target, CC kind); this sketch keys one ladder on the target alone (Frankendom ruling: one CC ladder).

interface Ladder { count: number; expiresAt: number; }     // NPC diminishing-returns window, per target
interface PlayerWindow { expiresAt: number; }              // player immunity window, started when a CC ends

const NPC_MIN_MS = 1000;        // a reapplication shorter than this is refused
const NPC_HP_GATE = 0.75;       // NPCs below this health share resist CC outright
const FLAT_WINDOW_MS = 60000;   // flat immunity window, used for NPC ladders and when adaptive is off
const ADAPTIVE_FACTOR = 6;      // adaptive player window = CC duration x factor
const ADAPTIVE_CAP_MS = 60000;  // adaptive window cap

type ApplyResult = { ok: true; durationMs: number } | { ok: false; reason: 'immune' | 'hp-gate' };

function playerWindowMs(durationMs: number, adaptive: boolean): number {
  return adaptive ? Math.min(ADAPTIVE_CAP_MS, durationMs * ADAPTIVE_FACTOR) : FLAT_WINDOW_MS;
}

// NPC: reapplication duration = base / (2 x count), refused when under 1 s. Each applied CC bumps count.
// Simplified: the window starts at the first application here; the donor starts it at CC start.
function applyToNpc(l: Ladder | null, baseMs: number, hpShare: number, now: number): { res: ApplyResult; next: Ladder | null } {
  if (hpShare < NPC_HP_GATE) return { res: { ok: false, reason: 'hp-gate' }, next: l };
  if (l === null || now >= l.expiresAt) {
    return { res: { ok: true, durationMs: baseMs }, next: { count: 1, expiresAt: now + FLAT_WINDOW_MS } };
  }
  const dur = Math.floor(baseMs / (2 * l.count));
  if (dur < NPC_MIN_MS) return { res: { ok: false, reason: 'immune' }, next: l };
  return { res: { ok: true, durationMs: dur }, next: { count: l.count + 1, expiresAt: l.expiresAt } };
}

// Player: refused while the immunity window runs. Otherwise the CC lands at full duration (no halving).
function applyToPlayer(w: PlayerWindow | null, baseMs: number, now: number): { res: ApplyResult; next: PlayerWindow | null } {
  if (w !== null && now < w.expiresAt) return { res: { ok: false, reason: 'immune' }, next: w };
  return { res: { ok: true, durationMs: baseMs }, next: null };
}

// Player: the window starts when the CC ends (donor calls TryApplyImmunity on effect removal, not on landing).
function onPlayerCcEnd(baseMs: number, adaptive: boolean, now: number): PlayerWindow {
  return { expiresAt: now + playerWindowMs(baseMs, adaptive) };
}

export {};
