// Licence of donor: GPL-2.0 (or later per source headers). Clean-room sketch written from the described mechanism (sort order, keep/switch ratios), not a translation of the donor lines.
// clean-room

export interface Hater {
  id: string;
  threat: number;       // stored threat, engine units
  taunt: 0 | 1 | 2;     // taunt state: 0 none, 1 taunted, 2 fixated (donor compares the state with >)
  suppressed: boolean;  // unreachable or dropped by evade timer
  inMelee: boolean;     // can reach this hater with a melee attack now
  isPlayer: boolean;
}

// Engine constants (donor values). Row fields would only change the evade timer and drop range.
export const KEEP_RATIO = 1.1;          // hold the current victim while no rival is above 110 percent
export const SWITCH_RATIO_RANGED = 1.3; // a rival at range must exceed 130 percent to take over
export const SWITCH_RATIO_MELEE = 1.1;  // a rival in melee reach needs only 110 percent
export const EVADE_TIMER_MS = 10000;    // unreachable target: act after 10 s

// Sort as the donor does: taunted first, normal before suppressed, then threat descending.
function sortHaters(list: Hater[]): Hater[] {
  return [...list].sort((a, b) =>
    (b.taunt - a.taunt) ||
    (Number(a.suppressed) - Number(b.suppressed)) ||
    (b.threat - a.threat));
}

// Walk the sorted list against the current victim, in the donor's order of checks.
export function selectVictim(list: Hater[], current: Hater | null): Hater | null {
  const sorted = sortHaters(list);
  // Donor with no current victim returns the first list entry even if suppressed (only ranged-skip filters it); mirrored here.
  if (!current) return sorted[0] ?? null;

  for (const rival of sorted) {
    if (rival.id === current.id) return current;                         // current is still the best
    if (rival.taunt > current.taunt) return rival;                       // taunt overrides
    if (rival.isPlayer && !current.isPlayer) return rival;               // player over non-player
    if (!rival.suppressed && current.suppressed) return rival;           // normal over suppressed
    if (rival.threat <= KEEP_RATIO * current.threat) return current;     // within 110 percent: keep
    if (rival.threat > SWITCH_RATIO_RANGED * current.threat ||
        (rival.threat > SWITCH_RATIO_MELEE * current.threat && rival.inMelee)) {
      return rival;                                                      // clearly ahead: switch
    }
  }
  return null;
}

// Evade timer expiry: a lone hater means go home, otherwise suppress the current victim.
export function onEvadeTimerExpired(list: Hater[]): 'evade-home' | 'suppress-current' {
  return list.length === 1 ? 'evade-home' : 'suppress-current';
}

export {};
