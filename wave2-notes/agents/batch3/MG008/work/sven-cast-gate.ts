// clean-room sketch: written from the described mechanism; no donor constants copied.
type SkillId = string;

interface Skill {
  id: SkillId;
  manaCost: number;     // spent from pool 1 on fire
  gaugeCost: number;    // spent from pool 2 (ability gauge) on fire
  range: number;        // tiles
  cooldownMs: number;   // 0 = no cooldown
  attackOnly: boolean;  // may only start during an attack action
}

interface Pools { mana: number; gauge: number; }
interface Point { x: number; y: number; }

interface CastState {
  pools: Pools;
  cooldownLeftMs: Map<SkillId, number>;
  pending: SkillId | null; // skill waiting to fire on arrival
}

type Outcome = "refused" | "walking" | "fired";

// Read-only gate. Cooldown is read here and written only at commit.
function refuseReason(skill: Skill, st: CastState, attacking: boolean): string | null {
  if (skill.attackOnly && !attacking) return "attack-only";
  if ((st.cooldownLeftMs.get(skill.id) ?? 0) > 0) return "cooling";
  if (st.pools.mana < skill.manaCost) return "no-mana";
  if (st.pools.gauge < skill.gaugeCost) return "no-gauge";
  return null;
}

// Fires now if the live target is inside range times leniency. Spend and cooldown are committed together.
function fireIfInReach(
  skill: Skill, st: CastState, caster: Point, target: Point, inSafeZone: boolean, leniency: number
): boolean {
  const reach = skill.range * leniency;
  const dx = target.x - caster.x;
  const dy = target.y - caster.y;
  if (inSafeZone || dx * dx + dy * dy > reach * reach) return false;
  st.pools.mana -= skill.manaCost;
  st.pools.gauge -= skill.gaugeCost;
  if (skill.cooldownMs > 0) st.cooldownLeftMs.set(skill.id, skill.cooldownMs);
  st.pending = null;
  return true;
}

// Key press or attack input.
function startCast(
  skill: Skill, st: CastState, attacking: boolean, caster: Point, target: Point, inSafeZone: boolean, leniency: number
): Outcome {
  if (refuseReason(skill, st, attacking) !== null) return "refused";
  if (fireIfInReach(skill, st, caster, target, inSafeZone, leniency)) return "fired";
  st.pending = skill.id; // caller paths toward the target; re-checked every tick
  return "walking";
}

// Once per tick. Cooldowns run on real elapsed time, clamped at 0. A pending cast re-checks at fire time.
function tickCast(
  skills: Map<SkillId, Skill>, st: CastState, dtMs: number, caster: Point, target: Point, inSafeZone: boolean, leniency: number
): Outcome | null {
  for (const [id, left] of st.cooldownLeftMs) {
    const next = left - dtMs;
    if (next > 0) st.cooldownLeftMs.set(id, next);
    else st.cooldownLeftMs.delete(id);
  }
  if (st.pending === null) return null;
  const skill = skills.get(st.pending);
  if (skill === undefined) { st.pending = null; return null; }
  // Arrival does not repeat the attack-only check; mana, gauge and cooldown are checked again at fire time.
  if (refuseReason(skill, st, true) !== null) { st.pending = null; return "refused"; }
  return fireIfInReach(skill, st, caster, target, inSafeZone, leniency) ? "fired" : "walking";
}

export {};
