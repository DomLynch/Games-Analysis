# EQEmu (pets-mounts-taming, cell 1)

Donor: `/mnt/frankendom-donors/EQEmu/zone/pets.cpp` (main: `Mob::MakePoweredPet` 81-136, `ZoneDatabase::GetPoweredPetEntry` 382-405) with `zone/aggro.cpp` 1665 (`Mob::PassCharismaCheck`), `zone/spells.cpp` 5282 (`Mob::ResistSpell`), `zone/horse.cpp` (whole file, 172 lines), `zone/mob.cpp` 748 and 804 (walk and run speed), `zone/client.cpp` 6350 (`Client::SuspendMinion`), data `utils/sql/svn/2069_required_pets.sql` | Licence: GPL-3.0-or-later (LICENSE.md is GPLv3; `zone/horse.cpp` header says "version 3 of the License, or (at your option) any later version") | C++ | symbol `Mob::MakePoweredPet`

Checked: Read in full: `zone/horse.cpp`, `Client::SuspendMinion` (6350-6465, body read), `Mob::PassCharismaCheck` (1665-1708, body read), `Mob::DoBuffTic` charm case (4051-4056 read; the function header is 3890), `Mob::BuffFadeBySlot` horse case (4328-4338 read; header 4250). Read in part: `MakePoweredPet` (81-136 read to the end of the scaling block; the AA max-HP bonus and the spawn call after 136 not read), `ResistSpell` (5340-5360 and 5520-5560 read; the header-to-5340 part and the partial-resist return branch after 5560 not read, so the exact break rate is not fully established), `_GetRunSpeed` (804-850 read; the movement-mod tail after 850 not read). Callers: `MakePoweredPet` has 3 direct callers (read: `MakePet` wrapper at pets.cpp 74, `client_packet.cpp:1728` zone-in restore, `client.cpp:6374` unsuspend); `PassCharismaCheck` has 2 (read: `spell_effects.cpp:4052` per buff tick, `spells.cpp:4513` harmony path). Confidence: high on pet power, mount speed and the stabling slot; medium on the charm break rate (the 0-200 roll and floor are read, the partial branch is not). Loyalty: grep for loyalty and tame terms in `zone/`, `common/` and `world/` found no pet-loyalty counter, so that half of the topic is absent here. camera_scope: not applicable.

Best transferable idea: a pet's power is a number the caster brings; a data table picks the highest tier at or below it, and the same number scales the summoned NPC's stats and adds a capped level bonus, saved with the pet so a suspend/recall keeps it.
Decision (proposed): adapt - take the tier-table-plus-power shape for summoned companions in the catalogue (zone data), not the donor's SQL or its level formula; the donor's cap comparison is a defect and is fixed in the sketch.
Acceptance: a server test at base level 1 asserts: power 0 gives level 1; power 25 gives level 3; power 250 gives level 11 (bonus capped at 10 and added once); power 275 gives level 11 too (never 12, and never a drop below the 250 result).

## 1. Mechanism

- Creation (`MakePoweredPet`, pets.cpp 81-): if the owner already has a pet, return (84). The power is an argument. -1 means "read the equipped pet focus now" (pets.cpp 88-93); a positive value is used as given (95-96); 0 stays 0. A tier row is then fetched: highest `petpower` at or below the power, for that pet type (`GetPoweredPetEntry`, 387, table keyed by `type` and `petpower`, `utils/sql/svn/2069_required_pets.sql:2`).
- Scaling (pets.cpp 123-136): runs only for a client or bot owner and only when the chosen tier row has `petpower == -1`. Inside that block, with `scale_power = power / 100` (125) and only when `scale_power > 0`: max HP and AC multiplied by `1 + scale` (128); min and max damage by `1 + scale/2` (132-133); size by `1 + scale/2`, capped at 3 times base (134); level increased by the level bonus (131). The stored record is then set to the power (136).
- Level bonus (131): `bonus = 1 + floor(power / 25)`, the comment says "one additional level for every 25 pet power". The cap is meant to be `PetPowerLevelCap` (rule default 10, `common/ruletypes.h:295`). The code is `level += (bonus > level + cap) ? cap : bonus`, so the cap is compared with `level + cap`, not `cap`. See defect 1 in section 6.
- Persistence: the power is saved with the pet when it is suspended (`client.cpp:6451`), and restored on unsuspend (`6374-6375`) and on a re-summon from saved info (`client_packet.cpp:1728`), so a recalled pet keeps its tier.
- Mounts (`horse.cpp`, `mob.cpp`): a summon refuses while a mount exists (horse.cpp 124-126). The mount is a 1-HP NPC built from a `horses` row keyed by the mount's filename (BuildHorseType; run speed is the row's `mountspeed`, horse.cpp:109). Stats are fixed at 75 for each (BuildHorseType, read, not receipted). Creating a new mount calls `SetHorseId`, which depops the old one (horse.cpp 155-157).
- Mounted speed (mob.cpp): `_GetWalkSpeed` (748) returns the horse's run speed when mounted (767). `_GetRunSpeed` (804) uses the horse's run speed (823) and walk speed (824) and flags `has_horse`. See defect 3.
- Dismount triggers (read): feign death, `SetFeigned` (`mob.cpp:8072`) and the feign-death effect (`spell_effects.cpp:1663`); the summon-horse buff fading (`BuffFadeBySlot`, `spell_effects.cpp:4337`). Re-summoning while mounted is refused, not a toggle. While mounted, hunger and thirst fall three times as fast (`client_process.cpp:1959-1960`, the `*= 3` line is read but not receipted), and mana regen uses the sitting formula (`client_mods.cpp:641`).
- Taming check (charm break, per buff tick): `DoBuffTic` calls `PassCharismaCheck` for a charm buff each tick (`spell_effects.cpp:4052`). It fades the charm when the check fails. `PassCharismaCheck` (`aggro.cpp`): no caster fails (1675). A no-resist charm passes (read, not receipted). Otherwise a roll 0-99 above `CharmBreakCheckChance` (25, `ruletypes.h:454`) passes at once (1688). Otherwise `ResistSpell(...CharmTick...)` is rolled (1690s); a full resist (100) keeps the charm (1697). Otherwise, for a client or bot caster, a Total Domination bonus (AA + spell + item `CharmBreakChance`) can still keep it (read, not receipted).
- Break floor and roll (`ResistSpell`, `spells.cpp`): on a charm tick, the resist chance is raised to at least `((100/25)/66*100)*2` (5533) = about 12.1 (the variable's type was not read, so whether it truncates to 12 is not confirmed). The roll is `Int(0, 200)` unless the soft cap rule is on (5549). If `roll > resist_chance` the result is 100 (5551), which keeps the charm. Otherwise the break happens (the partial branch after 5560 is not read). My arithmetic, not run: a break needs the 25 percent gate and a roll in 0-12, so about 0.25 x 13/201 = 1.6 percent per buff tick, roughly one break in 60 ticks. The comment at `aggro.cpp:1672` says "a lower limit of 5% chance to break per tick". The code does not give 5 percent, so the comment and the code disagree. Trust the code, not the comment.
- Stabling (`client.cpp` 6350): `SuspendMinion` keeps one stored minion (one slot). A second store is refused with `ONLY_ONE_PET` (6430). A pet that is engaged is refused (6434-6436). A pet that is fighting gets a message and is not stored (6440-6441). Otherwise the store saves spell ID, HP, mana, power and size (6448-6451), and the name plus buffs and items when `value >= 1`, then depops the pet (6461). Recall (6366-6395) creates a powered pet with the saved power and size, then restores buffs, items, HP, mana and taunt.
- Tick: none of this runs on its own loop. Taming checks run once per buff tick (`DoBuffTic`). Pet power runs once when the pet is created. Mount speed is read each time the speed is asked for.

## 2. Key functions

- `Mob::MakePoweredPet`: `/mnt/frankendom-donors/EQEmu/zone/pets.cpp` 81-136 (early out 84; focus or given power 88-96; tier lookup and NPC copy after 96; scaling block 123-136).
- `ZoneDatabase::GetPoweredPetEntry`: `/mnt/frankendom-donors/EQEmu/zone/pets.cpp` 382-405 (SQL: highest petpower at or below the power, 387).
- `Mob::PassCharismaCheck`: `/mnt/frankendom-donors/EQEmu/zone/aggro.cpp` 1665-1708 (comments 1667-1672; per-tick gate 1688; full-resist keep 1697; Total Domination 1700-1706, not receipted).
- `Mob::ResistSpell` (charm-tick part): `/mnt/frankendom-donors/EQEmu/zone/spells.cpp` 5282 (signature; `CharmTick` 5531-5536 floor; roll 5549-5551).
- `Mob::DoBuffTic` charm case: `/mnt/frankendom-donors/EQEmu/zone/spell_effects.cpp` 4051-4056 (inside `DoBuffTic`, header 3890).
- `Client::SummonHorse` and `Client::SetHorseId`: `/mnt/frankendom-donors/EQEmu/zone/horse.cpp` 118-160.
- `Mob::_GetWalkSpeed` (mount line 767): `/mnt/frankendom-donors/EQEmu/zone/mob.cpp` 748-803. `Mob::_GetRunSpeed` (mount 823-824): `/mnt/frankendom-donors/EQEmu/zone/mob.cpp` 804-850 read (tail not read).
- `Client::SuspendMinion`: `/mnt/frankendom-donors/EQEmu/zone/client.cpp` 6350-6465.

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constant (where it is) |
|---|---|
| Pick the highest tier at or below the power | Tier keys are the `petpower` column per pet type (`utils/sql/svn/2069_required_pets.sql:2`; query at pets.cpp:387). Focus powers come in steps of 5 (comment in MakePoweredPet just after line 96; not receipted). |
| Stat scale from power | `scale = power / 100` (pets.cpp:125). HP and AC `1 + scale` (128). Damage `1 + scale/2` (132-133). |
| Size scale with cap | `1 + scale/2`, capped at 3 x base size (pets.cpp:134). |
| Level bonus per power | `1 + floor(power/25)` (pets.cpp:131). Cap 10 by rule `PetPowerLevelCap` (ruletypes.h:295). |
| Scaling only for some rows and owners | Only when `record.petpower == -1` and owner is client or bot (pets.cpp:123). |
| Per-tick charm break gate | 25 (rule, `ruletypes.h:454`); gate at aggro.cpp:1688. |
| Charm break floor | `((100/25)/66*100)*2` = about 12.1 (spells.cpp:5533). |
| Resist roll range | 0-200 unless soft cap (spells.cpp:5549). |
| Mount run speed | Row field `mountspeed` (horse.cpp:109). |
| Hunger multiplier while mounted | x3 (client_process.cpp:1960, not receipted as a quote). |
| Stored pet slots | 1 (client.cpp:6430). |

## 4. TypeScript sketch

simplified: the sketch keeps the donor order (tier pick first, then stat scaling that runs only for power > 0), but takes the tier rows as an array instead of a SQL query, and leaves out the AA max-HP bonus, the record write-back, the bot path and the donor's integer truncation of damage and level. The level line is FIXED: it uses `min(bonus, cap)` instead of the donor's comparison against `level + cap` (defect 1). Mount, charm and stabling are not in the sketch.

```ts
// Pet power: a summoned companion takes a tier row, then stat scaling and a capped level bonus.
interface TierRow { petpower: number; npcId: string; }
interface BaseStats { level: number; maxHp: number; ac: number; minDmg: number; maxDmg: number; size: number; }

// Highest tier whose threshold is at or below the power. Power <= 0 is treated as 0.
function pickTier(rows: TierRow[], power: number): TierRow | undefined {
  const p = Math.max(0, power);
  let best: TierRow | undefined;
  for (const r of rows) {
    if (r.petpower <= p && (best === undefined || r.petpower > best.petpower)) best = r;
  }
  return best;
}

// One level per 25 power, never more than the cap (fixed: the donor compares against level + cap).
function levelBonus(power: number, cap: number): number {
  return Math.min(1 + Math.floor(power / 25), cap);
}

// Stat scaling on the base NPC, only when power > 0. Scale = power / 100.
function scalePet(base: BaseStats, power: number, cap: number): BaseStats {
  if (power <= 0) return { ...base };
  const s = power / 100;
  return {
    level: base.level + levelBonus(power, cap),
    maxHp: base.maxHp * (1 + s),
    ac: base.ac * (1 + s),
    minDmg: base.minDmg * (1 + s / 2),
    maxDmg: base.maxDmg * (1 + s / 2),
    size: Math.min(base.size * (1 + s / 2), base.size * 3),
  };
}

const rows: TierRow[] = [{ petpower: 0, npcId: "a" }, { petpower: 100, npcId: "b" }];
const pick = pickTier(rows, 150);
const scaled = scalePet({ level: 1, maxHp: 100, ac: 20, minDmg: 4, maxDmg: 8, size: 1 }, 250, 10);
console.log(pick?.npcId, scaled.level, levelBonus(250, 10));
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, PASSED (exit 0), file with `export {}` appended.

## 5. Lands in

- TARGET `src/fight/pets.ts` (new module; companion tiers and scaling are catalogue data read by the engine). Parity-checklist row 21 (catalogue fields): the tier rows and the power-to-level and stat rules are catalogue fields.
- Today: no companion or pet code in Frankendom's `src/fight` (not read in this pass; the target is a proposal).
- Reuse tag: rewrite-from-idea (GPL-3.0-or-later; clean-room only)
- Brief rule served: 1 (one engine: tiers and scale rules are data on one runtime, not per-client code).

## 6. Gaps and risks

- GPL-3.0-or-later: clean-room only. The sketch is written from the mechanism, not from the donor lines.
- Defect 1, level cap (pets.cpp:131): the cap is compared with `level + cap` and then adds `cap`, so the result is not monotonic. At base level 1, power 250 gives bonus 11 (not above 11), so +11 levels (level 12), past the cap of 10. Power 275 gives bonus 12 (above 11), so +10 (level 11). Fix: `min(bonus, cap)`, as in the sketch. Keep the idea; the defect is the comparison.
- Defect 2, scaling scope (pets.cpp:123): stat scaling runs only for client or bot owners with a `-1` tier row. That is a design choice, not a bug. Frankendom must decide: scale every companion by the same rule, or make the scale a per-row data field.
- Defect 3, mounted walk speed (mob.cpp:767): while mounted, `_GetWalkSpeed` returns the horse's run speed, so a mounted walk is as fast as a mounted run. The run path uses the horse's walk speed (824). Fix: return the horse's walk speed in the walk function. Keep the mount idea.
- Defect 4, comment drift (aggro.cpp:1672): the comment says a 5 percent floor, the code gives about 1.6 percent per buff tick by my arithmetic (not run). Fix: state the floor as data (rule value and formula) and drop the comment number.
- Charm break is a per-tick random loss of control. In a fight that the server must verify (kills are server-verified), a random break needs a logged server roll so the result can be replayed. Frankendom must not let the client decide the break.
- Mounts: the speed override changes the whole movement speed. Frankendom has no mount in the fight rules, and the duel step (row 1) is not about travel speed. A mount would be a zone-travel feature only, if adopted at all.
- Stabling: one saved companion slot, refused while engaged. If Frankendom adopts it, a saved companion must not stay in a Pit duel or a zone fight. Gap against the one-ledger rule: the saved companion's state must live in the one character record.
- Not read: `ResistSpell` partial-resist branch (after 5560), the Total Domination lines in full, `Mob::_GetRunSpeed` tail after 850, the AA max-HP path after pets.cpp:136. The break rate in section 1 is therefore arithmetic from the read lines only.
- MAX_ATTACKERS = 3: a companion would count as an attacker in a many-on-one fight. Not designed here; the engine owns that count, not the pet.

Reuse tag: rewrite-from-idea (GPL-3.0-or-later; clean-room only)
Brief rule served: 1 (one engine: tiers and scale rules are data; the server verifies the outcome)
