// Licence: AGPL-3.0 (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
type Flag = 'NPK' | 'PK' | 'PKLITE';

interface Duelist {
  id: string;
  flag: Flag;                    // current hostile flag
  chosenLevel: 'NPK' | 'PK';     // level set by a switch object; PKLITE is separate and cannot switch
  lastPvpHitAt: number;          // seconds: combat tag (refreshed by both sides of a PvP hit)
  respiteS: number | null;       // seconds of NPK respite counted so far; null = no respite
  murders: number;               // PK kills
  pklKills: number;              // PKLite kills
  lastMurderAt: number | null;   // seconds: last PK kill (switch cooldown reads this)
}

const COMBAT_TAG_S = 20;         // donor pk_timer: escape is blocked this long after a PvP hit
const RESPITE_S = 300;           // donor pk_respite_timer: NPK respite after a PK or PKLite death

// Harmful action only between equal, non-NPK flags.
function canHarm(attacker: Duelist, target: Duelist): boolean {
  return attacker.flag === target.flag && attacker.flag !== 'NPK';
}

// A PvP hit tags both sides. NPK is never tagged (donor uses a 'Free' status here).
function tagPvpHit(a: Duelist, b: Duelist, now: number): void {
  if (a.id === b.id) return;
  if (a.flag === 'NPK' || b.flag === 'NPK') return;
  a.lastPvpHitAt = now;
  b.lastPvpHitAt = now;
}

// Recall / portal are refused while the combat tag runs.
function escapeBlocked(p: Duelist, now: number): boolean {
  const flagged = p.flag === 'PK' || p.flag === 'PKLITE';
  return flagged && now - p.lastPvpHitAt < COMBAT_TAG_S;
}

// Killing a flagged player: PK kill counts a murder and stamps the killer; PKLite kill counts a lite kill.
// The victim drops to NPK and starts respite.
function onPlayerDeath(victim: Duelist, killer: Duelist | null, now: number): void {
  if (!killer || killer.id === victim.id) return;
  if (victim.flag === 'PK') {
    killer.murders += 1;
    killer.lastMurderAt = now;
  } else if (victim.flag === 'PKLITE') {
    killer.pklKills += 1;
  } else {
    return;
  }
  victim.flag = 'NPK';
  victim.respiteS = 0;
}

// Per heartbeat: respite counts up by the heartbeat length, then the flag is restored.
// serverLevel models a world-wide PK or PKLite setting (null = off).
function heartbeat(p: Duelist, heartbeatS: number, serverLevel: 'PK' | 'PKLITE' | null): void {
  if (p.respiteS === null) return;
  if (p.chosenLevel === 'NPK' && serverLevel === null) {
    p.respiteS = null;             // a plain NPK player with no world PK setting leaves respite at once
    return;
  }
  p.respiteS += heartbeatS;
  if (p.respiteS < RESPITE_S) return;
  p.respiteS = null;
  p.flag = serverLevel ?? p.chosenLevel;
}

// Switch use. NPK -> PK is always allowed when not in respite; PK -> NPK is refused for
// switchMinS seconds after the player's last PK kill (the switch object's own value).
type SwitchResult = 'ok' | 'in-respite' | 'pklite' | 'no-change' | 'dissonance';

function trySwitch(p: Duelist, to: 'NPK' | 'PK', switchMinS: number, now: number): SwitchResult {
  if (p.flag === 'PKLITE') return 'pklite';
  if (p.respiteS !== null) return 'in-respite';
  if (p.chosenLevel === to) return 'no-change';
  if (to === 'NPK' && p.lastMurderAt !== null && now - p.lastMurderAt < switchMinS) return 'dissonance';
  p.chosenLevel = to;
  p.flag = to;
  return 'ok';
}

export {};
