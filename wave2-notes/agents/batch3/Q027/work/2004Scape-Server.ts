// Licence of donor: MIT (Lost City, 2023-2025). Adaptable; this sketch is written from the described rule.
interface Player {
  x: number; z: number;
  combatLevel: number;
  busy: boolean;
  afk: boolean;
  inWild: boolean;
  lastCombatTick: number;   // tick of the player's last combat (the var the hunt reads)
}

interface HuntCfg {
  rate: number;             // throttle, in NPC turns
  keepHunting: boolean;     // findKeepHunting
  checkNotBusy: boolean;
  checkNotTooStrong: boolean;
}

interface NpcState {
  range: number;            // huntrange
  vislevel: number;
  clock: number;            // huntClock
  huntOn: boolean;          // huntMode !== -1
  target: Player | null;    // current interaction target, if any
  selfCombatTick: number;   // the NPC's own recent-combat tick
}

const GRACE_TICKS = 8;      // donor: skip when lastCombat + 8 > currentTick

function eligible(
  p: Player, n: NpcState, h: HuntCfg, tick: number,
  inRange: (p: Player) => boolean, visible: (p: Player) => boolean, isMulti: boolean,
): boolean {
  if (!inRange(p) || !visible(p)) return false;
  if (h.checkNotBusy && p.busy) return false;
  if (p.afk) return false;
  if (h.checkNotTooStrong && !p.inWild && p.combatLevel > n.vislevel * 2) return false;
  if (n.target !== p && !isMulti) {
    if (p.lastCombatTick + GRACE_TICKS > tick) return false;
    if (n.selfCombatTick + GRACE_TICKS > tick) return false;
  }
  return true;
}

// One NPC turn in the donor's order: clear the target, throttle, scan, count the clock, consume a find.
function huntTurn(
  n: NpcState, h: HuntCfg | null, players: Player[], tick: number, rnd: () => number,
  inRange: (p: Player) => boolean, visible: (p: Player) => boolean, isMultiAt: (p: Player) => boolean,
): Player | null {
  if (!h || !n.huntOn) return null;
  let found: Player | null = null;
  if (n.clock >= h.rate - 1 && n.range >= 1) {
    const ok = players.filter(p => eligible(p, n, h, tick, inRange, visible, isMultiAt(p)));
    if (ok.length > 0) found = ok[Math.floor(rnd() * ok.length)];
  }
  n.clock++;
  if (found) {
    n.clock = 0;
    if (!h.keepHunting) n.huntOn = false;
  }
  return found;
}

export {};
