# sven-n-MuMain (magic-spells-powers, cell 1)

Donor: `/mnt/frankendom-donors/sven-n-MuMain/src/source/GameLogic/Combat/SkillCast.cpp` (with `GameLogic/Skills/SkillManager.cpp`, `GameLogic/Combat/SkillExecution.cpp`, `Engine/Object/ZzzInterface.cpp`, `Engine/AI/ZzzAI.cpp`) | Licence: restricted. Repo root has no licence file; `_RESTRICTED-NOTE.txt` says "leaked Webzen MU Online client source (community-maintained), no licence. Study shape/idea only; never copy code, constants or text." Clean-room, shape only | C++ | symbol `CastWarriorSkill`

Checked: opened and read in full `SkillManager.cpp` (298 lines); read `SkillCast.cpp` 1-300 (CastWarriorSkill 67-112, SkillWarrior start 114-~200, weapon-special loop 200-270); `SkillExecution.cpp` 68-215, 355-380, 424-428; `ZzzInterface.cpp` 486-536 (CheckTile), 696-740 (CheckAttack, partly), 1300-1375 (MOVEMENT_SKILL arrival, melee group); `ZzzAI.cpp` 636-653 (cooldown tick); `SkillFieldDefs.h` 1-60 of 67. Scope: world-style combat cast (not a camera cell). Confidence: high on gate order, cooldown timing and the walk-then-fire loop (all receipted). Not read: `UseSkillWarrior` body (`SkillCast.cpp` 286-~470), `CheckSkillUseCondition`, `SKILL_REPLACEMENTS` entries (`_enum.h` 637), the per-frame driver of the MOVEMENT_SKILL switch, and all server code (not in this donor; the client is the only side here). Receipts quote signature and structural lines only; no donor constants are copied (restricted donor), so the range leniency factor and the blood-castle factor are described as "a factor" only.

Best transferable idea: a cast that is out of range becomes a walk-to-target state that re-reads the live target and re-checks cost and cooldown each tick, fires only when in reach, and writes the cooldown only at commit.
Decision (proposed): adapt - keep the walk-then-fire loop and gate order, but write cost and cooldown only when the server commits the cast, and use one range function for start and arrival (the donor does neither); this is the donor's idea with its defects fixed, not its client-side ledger.
Acceptance: a server test asserts that a cast refused for missing mana or the attack gate leaves the cooldown untouched; a caster outside range walks to the live target and fires once inside reach, and still fires when the target moves during the walk.

## 1. Mechanism

Order of steps, as the code runs:

(a) Entry. `ExecuteSkill` (`SkillExecution.cpp` 191) calls `CanExecuteSkill` (68) first: dead check, then a safe-zone block (77-~100) whose inner allow-list returns false on every path (see defect D3), then the requirement cache (152), the use-condition check (157) and `CheckMana` (162). On success it sets `Hero->CurrentSkill` (208) and dispatches by class: `SkillWarrior` (367) for weapon skills, `SkillElf` for the elf branch.

(b) Weapon-skill gate, `SkillWarrior` (`SkillCast.cpp` 114). For the main skill: mana short (173) requests a mana potion item (175-179) and refuses; gauge short (183) refuses; the cooldown is claimed by `CheckSkillDelay` (188); then the attack gate `CheckAttack()` (192); only then `CastWarriorSkill` (194). A second loop over the weapon's special list (about 200-270) repeats mana (207, 259), the cooldown (218) and the attack check (245), with the cooldown slot taken from `Hero->CurrentSkill` instead of `g_MovementSkill.m_iSkill`.

(c) Start of cast, `CastWarriorSkill` (67). It copies the selected target's tile into `TargetX/TargetY` (79-80), sets the reach to the skill range times a factor (85), applies a blood-castle override (87-96). If the caster is within reach (`CheckTile`, 99) it calls `UseSkillWarrior` (101) at once. Otherwise it calls `PathFinding2` (104) and sets the caster to `MOVEMENT_SKILL` (107) and sends a move.

(d) Walk-then-fire, the arrival loop. `ZzzInterface.cpp` 1314 (`case MOVEMENT_SKILL:`, melee group). Each pass it recomputes the base range with `GetSkillDistance` (1318), re-reads the target's tile from the live target (1350), and calls `CheckTile` with range times factor (1352) and "not in safe zone". In reach it calls `UseSkillWarrior` (1354). Out of reach it re-paths (1358) and sets `c->Movement = true` (1360). Note: the arrival range (1318) never applies the blood-castle override that the start path applies (96).

(e) Range test, `CheckTile` (`ZzzInterface.cpp` 490-~501). Squared distance from the caster's object position to the target tile centre is compared with squared (tile scale times range). Squared compare, no square root.

(f) Success. `ExecuteSkillComplete` (`SkillExecution.cpp` 426) returns `SkillSuccess && !Movement`, so a cast that is still walking does not count as done.

Cooldown, `CSkillManager::CheckSkillDelay` (`SkillManager.cpp` 140-171): (146) skills in a fixed list are refused when not in attack state; (144) read the skill's base delay; if it is above zero: (158) refuse while the per-skill timer is above zero; (165) refuse when the skill's leadership requirement is above the hero's leadership total (this check runs only in the cooldown branch); (170) start the timer at the base delay. The timer is started inside the check, before the caller's attack gate (defect D1).

Cooldown tick, `CalcSkillDelay` (`SkillManager.cpp` 174-190). Called every frame from `ZzzAI.cpp` 653 with the real elapsed milliseconds, only in the main scene. Subtracts elapsed time from each active slot (185) and clamps at zero. Slot loop is `SkillNumber + 2`, capped at the slot maximum (176-179); the "+2" was not explained in the code I read.

Requirements. `GetSkillInformation_Energy` (`SkillManager.cpp` 69-~100): energy field 0 means free (80); a skill at level 0 uses the energy field as the direct cost (91); otherwise a base value plus energy times level times a percent, with different base and percent for summon skills and for one class (values not recorded). The results feed a requirement cache, `RebuildSkillAttributeRequirementsCache` (259-~298): dirty flag, rebuilt lazily from the hero's stat totals (level, strength, dexterity, vitality, energy, leadership); guardian maps block the two teleport skills (279); each skill's requirement is compared with the hero totals (295).

Data. Each skill is a row with the fields in `SKILL_FIELDS_SIMPLE` (`Data/GameData/SkillData/SkillFieldDefs.h` 11-~20): Level, Damage, Mana (14), AbilityGuage (15, second-pool cost), Distance (16, range), Delay (17, cooldown), Energy (18), Charisma (19, leadership requirement), MasteryType, SkillUseType, Brand, KillCount. Arrays give class and duty requirements (3 duty slots, 7 class slots). Also strength and dexterity requirements, IsDamage and Effect (after-array fields, not read in full). The field list is one X-macro that also drives the editor, CSV export and save/load.

Pools. Two pools per caster: mana (`CharacterAttribute->Mana`) and the ability gauge (`CharacterAttribute->SkillMana`, the AbilityGuage cost). Both are checked before the cast; no cast time; the "cast time" is the walk to reach.

Server authority. Not in this donor. The client writes the cooldown and does not show a deduction result; a cast's real cost and cooldown are decided elsewhere (not read).

## 2. Key functions

- `CastWarriorSkill`: `/mnt/frankendom-donors/sven-n-MuMain/src/source/GameLogic/Combat/SkillCast.cpp` 67-112 (start of cast: target snapshot, reach, fire-or-walk).
- `SkillWarrior`: `/mnt/frankendom-donors/sven-n-MuMain/src/source/GameLogic/Combat/SkillCast.cpp` 114-~270 (mana, gauge, cooldown claim, attack gate, dispatch; weapon-special loop).
- `UseSkillWarrior`: `/mnt/frankendom-donors/sven-n-MuMain/src/source/GameLogic/Combat/SkillCast.cpp` 286 (the fire step; body not read).
- `ExecuteSkill` and `CanExecuteSkill`: `/mnt/frankendom-donors/sven-n-MuMain/src/source/GameLogic/Combat/SkillExecution.cpp` 191 and 68-168; `CheckMana` 170-180.
- `CSkillManager::CheckSkillDelay`: `/mnt/frankendom-donors/sven-n-MuMain/src/source/GameLogic/Skills/SkillManager.cpp` 140-171.
- `CSkillManager::CalcSkillDelay`: `/mnt/frankendom-donors/sven-n-MuMain/src/source/GameLogic/Skills/SkillManager.cpp` 174-190; caller `/mnt/frankendom-donors/sven-n-MuMain/src/source/Engine/AI/ZzzAI.cpp` 653.
- `CheckTile`: `/mnt/frankendom-donors/sven-n-MuMain/src/source/Engine/Object/ZzzInterface.cpp` 490-~501.
- MOVEMENT_SKILL arrival (melee group): `/mnt/frankendom-donors/sven-n-MuMain/src/source/Engine/Object/ZzzInterface.cpp` 1314-1360.

## 3. Numbers vs mechanism

TABLE (values are not recorded because the donor is restricted; "per skill" means a data field):

| name | effect | formula | number ranges | cost | cooldown/cast time | caps | file:line |
|---|---|---|---|---|---|---|---|
| Gate order | refuse before any state change | attack-only, cooldown, mana, gauge (read-only in the check) | n/a | none | none (instant on fire) | n/a | SkillWarrior 173-194 |
| Mana pool | spent on fire | mana >= per-skill Mana | per skill, not recorded | Mana (pool 1) | n/a | refused when short; potion request sent | SkillCast.cpp 173-179 |
| Ability gauge pool | second pool spent on fire | gauge >= per-skill AbilityGuage | per skill, not recorded | AG (pool 2) | n/a | refused when short | SkillCast.cpp 183 |
| Reach | fire when inside reach | squared distance <= (scale x range x factor)^2 | factor above 1, not recorded | none | none | none | SkillCast.cpp 85; ZzzInterface.cpp 499 |
| Walk-to-fire | caster walks to live target, fires in reach | re-path each pass with same reach | as reach | none | walk time, not capped | none | ZzzInterface.cpp 1350-1358 |
| Cooldown | per-skill lockout | timer = base delay at commit (donor: at gate); minus elapsed ms per frame; clamp 0 | per skill, not recorded | none | Delay field, ms | one timer per slot | SkillManager.cpp 144-170, 185; ZzzAI.cpp 653 |
| Leadership gate | skill refused if leadership too low | skill leadership > hero leadership | per skill | none | only on cooldown skills | none | SkillManager.cpp 165 |
| Energy requirement | level gate | 0 = free; level 0 = direct cost; else base + energy x level x percent / 100 | base and percent not recorded | none | none | cached | SkillManager.cpp 80, 91 |

Which numbers suit a fast mobile fight (proposed by this reader, not donor values): cooldowns in the 1-8 s band for specials; a reach factor of about 1.1-1.3 so the walk ends near the target rather than at its edge; the walk-to-fire loop should be capped (a maximum walk time) so a caster cannot chase forever. Two pools may be one stamina pool plus an optional focus; Frankendom should not add a second pool unless a design needs it.

Defects found (keep the idea, fix the defect):

- D1. The cooldown is started inside `CheckSkillDelay` (`SkillManager.cpp` 170), before the attack gate (`SkillCast.cpp` 192). A refused cast still burns the cooldown. fix: check in the gate, write the cooldown only at commit (see sketch).
- D2. The start path applies a blood-castle range override (`SkillCast.cpp` 96), but the arrival path reads the base range (`ZzzInterface.cpp` 1318) and never applies it. A cast started there can stop short. fix: one range function used by start and arrival.
- D3. The safe-zone allow-list is dead code: inside `if (c->SafeZone)` (`SkillExecution.cpp` 77), every path returns false (79 and after). fix: keep one allow-list and test it.
- D4. `SKILL_REPLACEMENTS` is followed in a `while (true)` loop (`SkillManager.cpp` 208-214) with no cycle guard; the map contents were not read. fix: bounded loop, or one-level table checked at load.
- D5. The weapon-skill flow takes the cooldown slot from two sources (`SkillCast.cpp` 188 uses `g_MovementSkill.m_iSkill`, 218 uses `Hero->CurrentSkill`). Whether they always match was not verified. fix: pass the slot id once.
- D6. The mana-short branch sends a potion request on every refused attempt (`SkillCast.cpp` 173-179), with no rate limit. How often `SkillWarrior` runs was not read. fix: rate-limit the request.
- D7. The cooldown tick loops over `SkillNumber + 2` slots (`SkillManager.cpp` 176-179); the reason for the +2 was not read. fix: iterate the real slot list.

## 4. TypeScript sketch

simplified: the sketch keeps the donor's gate order (attack-only, cooldown, mana, gauge), the walk-then-fire loop and the per-tick cooldown decrement by real elapsed time. It reorders the cooldown: it is written only at commit (the donor writes it inside the gate, `SkillManager.cpp` 170). It re-checks mana, gauge and cooldown at fire time on arrival (the donor re-checks only range on arrival). It omits: pathfinding and the walk itself, the server authority and ledger (not in donor), the potion auto-use request, the safe-zone allow-list, the blood-castle override, the leadership and energy requirements, the per-class weapon-special branches and the requirement cache. The range factor is a parameter (donor's value not recorded: restricted).

```ts
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
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020 /tmp/sven-cast-gate.ts` on the VPS, exit 0.

## 5. Lands in

- TARGET `src/fight/cast.ts` (new engine casting gate; the walk-then-fire loop runs in the engine, not in the Pit or a zone client). Parity-checklist row 13 (specials).
- Reuse tag: rewrite-from-idea (restricted donor; shape only, clean-room).
- Brief rule served: 1 (one engine: the cast gate and cooldown live in `src/fight`); row 13 specials.

## 6. Gaps and risks

- Restricted donor: clean-room only. No donor constants, text or formulas beyond shape are carried into Frankendom. Every number is a Frankendom data field.
- Client-only donor: the cooldown and the cost are written by the client here. Frankendom's rule is server-verified outcomes, so the server must commit cost and cooldown, and the client shows a predicted state only.
- One-ledger rule: the donor keeps cooldown on the character attributes and the reach in two places (start and arrival). Frankendom must have one range function and one cooldown writer (D1, D2).
- MAX_ATTACKERS = 3: several casters can walk to one target. The donor has no slot logic in the cast path that was read; Frankendom's engine owns the attack slots, so the walk must yield when a slot is not free.
- Dead allow-list (D3): a safe-zone or arena rule written as an allow-list must be tested, or it silently refuses everything.
- The reach test uses the target tile centre, not the target's body radius. Frankendom needs body radius in the reach check (not in donor).
- Not read: `UseSkillWarrior` body, `CheckSkillUseCondition`, the replacement map contents, the per-frame driver of the MOVEMENT_SKILL switch and all server code.

Reuse tag: rewrite-from-idea (restricted; shape only)
Brief rule served: 1 (one engine); specials row 13
