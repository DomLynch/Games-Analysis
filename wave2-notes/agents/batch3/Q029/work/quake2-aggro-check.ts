// Licence: GNU GPL version 2 or later (donor game/g_ai.c header). Clean-room sketch written from the described mechanism; not a translation of the donor lines.
// clean-room
type Band = 'melee' | 'near' | 'mid' | 'far';
type Pt = { x: number; y: number; z: number };
type Action = 'melee' | 'missile' | null;

interface Foe { pos: Pt; alive: boolean; lightLevel: number; hidden: boolean; showHostileUntil: number; }
interface Mon {
  pos: Pt; yaw: number; standGround: boolean; skill: number;
  enemy: Foe | null; oldEnemy: Foe | null;
  attackReadyAt: number; searchUntil: number; lastSighting: Pt | null;
}

const MELEE_DISTANCE = 80, NEAR_DISTANCE = 500, MID_DISTANCE = 1000; // donor range bands, in game units
const HEAR_RANGE = 1000;                 // donor: a heard sound must be within 1000 units
const IN_FRONT_DOT = 0.3;                // donor infront(): dot above 0.3
const LIGHT_MIN = 5;                     // donor: light_level <= 5 is never seen
const SEARCH_EXTEND_S = 5;               // donor: search time is set to now + 5 on sight
const SEARCH_GIVE_UP_S = 20;             // donor: give up when time > search time + 20

const dist = (a: Pt, b: Pt): number => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);

function band(d: number): Band {
  if (d < MELEE_DISTANCE) return 'melee';
  if (d < NEAR_DISTANCE) return 'near';
  if (d < MID_DISTANCE) return 'mid';
  return 'far';
}

// Simplified to 2D: the donor normalises the full vector and dots it with the facing.
function inFront(m: Mon, f: Foe): boolean {
  const dx = f.pos.x - m.pos.x, dy = f.pos.y - m.pos.y;
  const len = Math.hypot(dx, dy);
  if (len === 0) return false;
  return (dx * Math.cos(m.yaw) + dy * Math.sin(m.yaw)) / len > IN_FRONT_DOT;
}

// Sight rule from the donor's FindTarget: far is never seen; dark is never seen; must be visible;
// near needs a live show window or the foe in front; mid needs the foe in front.
function seesFoe(m: Mon, f: Foe, now: number, visible: boolean): boolean {
  if (!f.alive || f.hidden) return false;
  const b = band(dist(m.pos, f.pos));
  if (b === 'far' || f.lightLevel <= LIGHT_MIN || !visible) return false;
  if (b === 'near' && f.showHostileUntil < now && !inFront(m, f)) return false;
  if (b === 'mid' && !inFront(m, f)) return false;
  return true;
}

// Hearing: a sound counts only inside the hearing range and when the sound is in the same area.
function hearsSound(m: Mon, src: Pt, sameArea: boolean): boolean {
  return sameArea && dist(m.pos, src) <= HEAR_RANGE;
}

// Donor M_CheckAttack. Melee band: melee at once, no cooldown, skill-gated. Otherwise a missile needs the
// cooldown and a roll: 0.4 when standing ground, 0.1 near, 0.02 mid. Easy halves it, hard doubles it.
function checkAttack(m: Mon, b: Band, clearShot: boolean, now: number, roll: () => number): Action {
  if (!clearShot) return null;
  if (b === 'melee') {
    if (m.skill === 0 && roll() < 0.75) return null;
    return 'melee';
  }
  if (now < m.attackReadyAt || b === 'far') return null;
  let chance = m.standGround ? 0.4 : b === 'near' ? 0.1 : 0.02;
  if (m.skill === 0) chance *= 0.5;
  else if (m.skill >= 2) chance *= 2;
  if (roll() < chance) {
    m.attackReadyAt = now + 2 * roll();
    return 'missile';
  }
  return null;
}

// Memory: a visible enemy refreshes the search time and the last sighting. After the search time passes by
// more than 20 s the unit stops searching. (Donor ai_run, 977-983; ai_checkattack, 869-870.)
function tickMemory(m: Mon, visible: boolean, now: number): 'pursue' | 'search' | 'idle' {
  if (visible && m.enemy) {
    m.searchUntil = now + SEARCH_EXTEND_S;
    m.lastSighting = { ...m.enemy.pos };
    return 'pursue';
  }
  if (m.searchUntil !== 0 && now > m.searchUntil + SEARCH_GIVE_UP_S) {
    m.searchUntil = 0;
    return 'idle';
  }
  return 'search';
}

// Dead enemy: fall back to the old enemy (and hunt it), otherwise go back to walking.
function dropDeadEnemy(m: Mon, now: number): 'hunt-old' | 'walk' | null {
  if (m.enemy && m.enemy.alive) return null;
  m.enemy = null;
  if (m.oldEnemy && m.oldEnemy.alive) {
    m.enemy = m.oldEnemy;
    m.oldEnemy = null;
    if (!m.standGround) m.attackReadyAt = now + 1; // donor HuntTarget: first attack waits one second
    return 'hunt-old';
  }
  return 'walk';
}

export {};
