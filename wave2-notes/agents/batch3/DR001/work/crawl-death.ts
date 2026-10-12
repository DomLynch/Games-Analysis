// Licence: GPL-2.0 (donor Dungeon Crawl Stone Soup, LICENSE "Version 2, June 1991"). Clean-room sketch written from the described mechanism; not a translation of the donor lines.
// clean-room

// ---- 1. A lethal hit: spirit shield split, then god save, then Xom, then lives ----
export interface Pools { hp: number; hpMax: number; mp: number; }

// Spirit shield: MP takes a share of the hit in proportion to the two pools, but never so much that the hit kills.
export function spiritShieldSplit(dam: number, p: Pools, roundFair: (x: number) => number): number {
  const share = roundFair((dam * p.mp) / Math.max(p.hp + p.mp, 1));
  const mpTaken = Math.min(Math.max(share, dam + 1 - p.hp), p.mp);
  return dam - mpTaken; // damage left for HP
}

export interface GodSave { piety: number; pietyBreakpoint5: number; protectPassive: boolean; lifesavingPassive: boolean; giftTimeout: number; }

// Chance to survive a fatal hit by god protection. Protection uses piety over 1000; lifesaving uses piety over 160 and needs no cooldown.
export function godSaveChance(g: GodSave): { protect: number; lifesave: number } {
  const protect = g.protectPassive || g.lifesavingPassive
    ? (100 + Math.min(g.pietyBreakpoint5, g.piety)) / 1000 : 0;
  const lifesave = g.lifesavingPassive && g.giftTimeout === 0 ? Math.min(1, g.piety / 160) : 0;
  return { protect: Math.min(1, protect), lifesave };
}

// Cooldown after a lifesaving save: adds to the timer, capped at 200.
export function addGiftTimeout(timeout: number, val: number): number {
  return Math.min(200, timeout + val);
}

// Xom: a worshipper of Xom has a one-in-twenty chance, gated by tension and mood. Returns HP left, or null.
export function xomSave(
  worshipsXom: boolean, rnd: () => number, tension: number, xomIsNice: boolean, hpMax: number,
): number | null {
  if (!worshipsXom) return null;
  if (rnd() >= 1 / 20) return null;
  if (tension < Math.floor(rnd() * 5) || !xomIsNice) return null;
  return 1 + Math.floor(rnd() * Math.floor(hpMax / 4));
}

// A spent life sets a pending revival and leaves a corpse at the spot. No lives means the run ends.
export function onLethalHit(lives: number, realDeath: boolean): { lives: number; revive: boolean; corpse: boolean } {
  if (lives > 0 && realDeath) return { lives: lives - 1, revive: true, corpse: true };
  return { lives, revive: false, corpse: false };
}

// ---- 2. Revival: full HP and MP, durations cleared, then a low-threat floor cell ----
export interface Cell { x: number; y: number; floor: boolean; threat: number; }
export function bringToSafety(sample: () => Cell, tries = 100000): Cell | null {
  let best: Cell | null = null;
  for (let t = 0; t < tries && (best === null || best.threat > 0); t++) {
    const c = sample();
    if (!c.floor) continue;
    if (best === null || c.threat < best.threat) best = c;
  }
  return best;
}

// ---- 3. Permadeath: a bones ghost for other games, with capped stats ----
export const MAX_GHOST_HP = 400;
export const MAX_GHOST_EVASION = 50;
export const GHOST_LIMIT = 27; // ghost files per level

export interface GhostRecord { name: string; hpMax: number; evasion: number; }
export function makeGhost(name: string, hpMax: number, evasion: number): GhostRecord {
  return { name, hpMax: Math.min(hpMax, MAX_GHOST_HP), evasion: Math.min(evasion, MAX_GHOST_EVASION) };
}
export function ghostEligible(depth: number, inDungeon: boolean, tutorial: boolean): boolean {
  return !tutorial && (!inDungeon || depth > 2);
}
export function canSaveGhost(filesOnLevel: number): boolean {
  return filesOnLevel < GHOST_LIMIT;
}

// ---- 4. Animate dead: a timed window; monsters that die in view may rise as friendly zombies ----
export function animateWindowTurns(pow: number, rnd: (n: number) => number): number {
  return 20 + rnd(1 + pow);
}
export function reapChance(pow: number): number {
  return Math.min(1, (150 + pow / 2) / 200);
}
// Recasting first dismisses the zombies this caster made.
export function recast(zombieIds: number[]): { dismissed: number[] } {
  return { dismissed: zombieIds.slice() };
}
export {};
