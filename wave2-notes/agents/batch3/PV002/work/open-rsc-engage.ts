// Licence: AGPL-3.0 (donor). clean-room sketch written from the described rule, not a translation of the donor lines.
// clean-room
type Mode = "optin-band" | "depth-band";

interface Fighter {
  id: string;
  combatLevel: number;
  maxAttack: number;
  maxDefense: number;
  maxStrength: number;
  depth: number;            // PvP depth at the fighter's tile, from zone data (0 = no PvP here)
  pvpOptIn: boolean;        // mutual opt-in flag
  partyId: string | null;
  duelOpponentId: string | null;
  ranAwayTick: number;      // tick the victim last ran away
}

type Check = { ok: true } | { ok: false; reason: string };

const OPTIN_LEVEL_GAP = 5;    // donor constant for the opt-in mode
const OPTIN_STAT_GAP = 10;    // donor constant, applied to attack, defence and strength
const REATTACK_TICKS = 5;     // donor default for the reattack cooldown

function canEngage(a: Fighter, v: Fighter, tick: number, missile: boolean, mode: Mode): Check {
  if (a.partyId !== null && a.partyId === v.partyId) return { ok: false, reason: "same party" };
  // Active mutual duel: bypass the band and the cooldown (duel is its own arena).
  if (a.duelOpponentId === v.id && v.duelOpponentId === a.id) return { ok: true };
  if (!missile && v.ranAwayTick + REATTACK_TICKS > tick) return { ok: false, reason: "reattack cooldown" };

  if (mode === "optin-band") {
    if (!a.pvpOptIn || !v.pvpOptIn) return { ok: false, reason: "not opted in" };
    const levelGap = Math.abs(a.combatLevel - v.combatLevel);
    if (levelGap > OPTIN_LEVEL_GAP) return { ok: false, reason: `level gap ${levelGap} > ${OPTIN_LEVEL_GAP}` };
    const statGap = Math.max(
      Math.abs(a.maxAttack - v.maxAttack),
      Math.abs(a.maxDefense - v.maxDefense),
      Math.abs(a.maxStrength - v.maxStrength),
    );
    if (statGap > OPTIN_STAT_GAP) return { ok: false, reason: `stat gap ${statGap} > ${OPTIN_STAT_GAP}` };
    return { ok: true };
  }

  // Depth band: both must stand on PvP ground, and the level gap must fit BOTH depths.
  if (a.depth < 1 || v.depth < 1) return { ok: false, reason: "no PvP ground" };
  const gap = Math.abs(a.combatLevel - v.combatLevel);
  if (gap > a.depth) return { ok: false, reason: `level gap ${gap} > your band ${a.depth}` };
  if (gap > v.depth) return { ok: false, reason: `level gap ${gap} > their band ${v.depth}` };
  return { ok: true };
}

export {};
