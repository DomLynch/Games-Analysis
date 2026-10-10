// Licence: unclear (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export interface RolePick { level: number; skills: Skill[] }
export interface Skill { id: number; level: number }
export interface Enemy { level: number; skills: Skill[]; hasItems: boolean }

export interface EncounterParams {
  enemiesFloorDivisor: number;   // 4: one more enemy every 4 floors
  maxEnemies: number;            // 8: intended cap
  levelBand: number;             // 3: enemy base level may exceed the floor by at most this
  maxRoleLevel: number;          // donor MAX_ROLE_LEVEL (value not read)
  noItemsBelowFloor: number;     // 5
  skillRollEveryFloors: number;  // 10: one skill roll per 10 floors (at least one)
  maxSkills: number;             // 10
  skillIdCount: number;          // 93: ids 0..92
  skippedSkillIds: number[];     // [75, 76]: roll consumed, nothing learned
  skillLevelPerFloor: number;    // 25
  skillLevelCap: number;         // 900
  expPerFloor: number;           // 400
}

export type Rng = () => number; // uniform in [0, 1)

// Inclusive integer range, like Lua math.random(lo, hi).
function randInt(lo: number, hi: number, rng: Rng): number {
  return lo + Math.floor(rng() * (hi - lo + 1));
}

export function makeEncounter(
  floor: number,
  roles: RolePick[],
  p: EncounterParams,
  rng: Rng,
): { enemies: Enemy[]; exp: number } {
  // Roster size: one enemy per divisor floors, at least 1, capped.
  const count = Math.max(1, Math.min(Math.floor(floor / p.enemiesFloorDivisor), p.maxEnemies));

  // Eligible base roles: the donor re-rolls until the level fits; one filter gives the same uniform pick.
  const pool = roles.filter((r) => r.level <= floor + p.levelBand);
  if (pool.length === 0) throw new Error("no role within level band");

  const enemies: Enemy[] = [];
  for (let i = 0; i < count; i++) {
    const base = pool[randInt(0, pool.length - 1, rng)];
    const enemy: Enemy = {
      // Levelled up to the floor (capped), never lowered below the base level.
      level: Math.max(base.level, Math.min(floor, p.maxRoleLevel)),
      skills: base.skills.map((s) => ({ ...s })),
      hasItems: floor >= p.noItemsBelowFloor,
    };

    // Skill rolls: max(floor(floor / 10), 1) rolls, each may learn one skill.
    const rolls = Math.max(Math.floor(floor / p.skillRollEveryFloors), 1);
    for (let r = 0; r < rolls; r++) {
      if (enemy.skills.length >= p.maxSkills) continue;
      const id = randInt(0, p.skillIdCount - 1, rng);
      if (!p.skippedSkillIds.includes(id)) enemy.skills.push({ id, level: 0 });
    }

    // Skill levels rise toward floor * 25, capped at 900.
    const target = floor * p.skillLevelPerFloor;
    for (const s of enemy.skills) {
      if (s.level < target) s.level = Math.min(randInt(s.level, target, rng), p.skillLevelCap);
    }

    enemies.push(enemy);
  }

  return { enemies, exp: p.expPerFloor * (floor + 1) };
}

export {};
