// Licence: Sustainable Use License 1.0 (donor, LICENSE.md): restricted. clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export {};

const FP = 64; // fixed point: 64 units per whole damage point (donor convention)

type Tile = [number, number];
type MonsterMode = "stand" | "hitRecovery" | "petrified" | "death";

interface Monster {
  level: number;
  hp: number;               // fixed point
  mode: MonsterMode;
  tile: Tile;               // where the monster is drawn
  old: Tile;                // last settled tile
  alwaysHardHit: boolean;   // donor: a fixed class list always counts as a hard hit
  hasKnockback: boolean;    // donor: monster flag, pushes the player one tile
}

interface MonsterHitResult { sound: boolean; flinch: boolean; knockedBack: boolean; dead: boolean; }

// Hard hit: whole points of damage at or above level + 3, or an always-hard class.
function isHardHit(m: Monster, dmgFixed: number): boolean {
  if (m.alwaysHardHit) return true;
  return Math.floor(dmgFixed / FP) >= m.level + 3;
}

// The stagger: the monster stops where it was and plays the got-hit clip until it ends.
function startGotHit(m: Monster): void {
  m.mode = "hitRecovery";
  m.tile = m.old;
}

// Knockback: one step directly away from the attacker's start tile, only if the step is free.
function knockback(m: Monster, attackerTile: Tile, free: (t: Tile) => boolean): boolean {
  const step: Tile = [Math.sign(m.tile[0] - attackerTile[0]), Math.sign(m.tile[1] - attackerTile[1])];
  const target: Tile = [m.old[0] + step[0], m.old[1] + step[1]];
  if (!free(target)) return false;
  m.old = target;
  startGotHit(m);
  return true;
}

// Order follows the donor: damage first; a killing blow ends here; otherwise knockback (if the
// attacker has it), then the hit sound and, for a hard hit, the stagger. A petrified monster never staggers.
function monsterHitByPlayer(m: Monster, dmgFixed: number, attackerTile: Tile, attackerHasKnockback: boolean, free: (t: Tile) => boolean): MonsterHitResult {
  m.hp -= dmgFixed;
  if (m.hp <= 0) return { sound: false, flinch: false, knockedBack: false, dead: true };

  let knockedBack = false;
  if (attackerHasKnockback && m.mode !== "petrified") {
    knockedBack = knockback(m, attackerTile, free);
  }

  const hard = isHardHit(m, dmgFixed);
  let flinch = false;
  if (hard && m.mode !== "petrified") {
    startGotHit(m);
    flinch = true;
  }
  return { sound: true, flinch, knockedBack, dead: false };
}

// The stagger ends when the got-hit clip reaches its last frame; the monster returns to stand.
function updateStagger(m: Monster, clipOnLastFrame: boolean): void {
  if (m.mode === "hitRecovery" && clipOnLastFrame) m.mode = "stand";
}

interface PlayerHitState { level: number; barbarian: boolean; recoveryTier: 0 | 1 | 2 | 3; }

// Player flinch: the threshold is the level (barbarian: level + level/4). A forced hit always flinches.
function playerFlinch(p: PlayerHitState, dmgFixed: number, forced: boolean): { flinch: boolean; skipFrames: number } {
  const threshold = p.barbarian ? p.level + Math.floor(p.level / 4) : p.level;
  const flinch = forced || Math.floor(dmgFixed / FP) >= threshold;
  const skipFrames = [0, 1, 2, 3][p.recoveryTier];   // item tiers: none, fast, faster, fastest
  return { flinch, skipFrames: flinch ? skipFrames : 0 };
}

// Incoming monster damage: rolled damage plus the player's get-hit bonus, never below one point.
function incomingDamage(rolledFixed: number, getHitPoints: number): number {
  return Math.max(rolledFixed + getHitPoints * FP, FP);
}

// Example use, so the file type-checks under --strict.
const goblin: Monster = { level: 3, hp: 20 * FP, mode: "stand", tile: [5, 5], old: [5, 5], alwaysHardHit: false, hasKnockback: false };
const r = monsterHitByPlayer(goblin, 6 * FP, [4, 5], true, () => true);
updateStagger(goblin, true);
const pf = playerFlinch({ level: 8, barbarian: true, recoveryTier: 2 }, 9 * FP, false);
const dmg = incomingDamage(4 * FP, 1);
void r; void pf; void dmg;
