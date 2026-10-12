# azerothcore-azerothcore-wotlk (magic-spells-powers, cell 1)

Donor: `/mnt/frankendom-donors/azerothcore-azerothcore-wotlk/src/server/game/Spells/` (Spell.cpp, SpellInfo.cpp, SpellMgr.cpp, Auras/SpellAuras.cpp) with `Entities/Unit/Unit.cpp`, `Entities/Object/Object.cpp`, `Entities/Player/Player.cpp`; data `data/sql/base/db_world/spell_dbc.sql` | Licence: GPL-2.0 (LICENSE: "GNU GENERAL PUBLIC LICENSE, Version 2, June 1991"; source headers say "or (at your option) any later version") | C++ | symbols `Spell::prepare`, `Unit::GetDiminishing`, `Unit::ApplyDiminishingToDuration`, `Unit::GetEffectiveResistChance`, `WorldObject::MagicSpellHitResult`

Checked: Opened and read in part: Spell.cpp prepare (3556-3670), update (4525-4611), Delayed (8100-8140), TriggerGlobalCooldown (9228-9260), DR caller (3196-3275); Spell.h 650-660; SpellInfo.cpp CalcCastTime (2778-2790), GetMaxTicks (2794-2821), GetRecoveryTime (2824-2827), CalcPowerCost (2829-2900, first half read in full); Unit.cpp DR ladder (11353-11490, read in full), resist (2229-2400, read in full), GetResistance (15884-15895), damage-bonus path (8507-8680, the coefficient branches read, CalculateLevelPenalty not read), interrupt-on-damage (1040-1060, 1300-1330); Object.cpp MagicSpellHitResult (3534-3670, read in full); SpellEffects.cpp dispel (2704-2760, partly); Player.cpp Regenerate (1884-1990, partly); SpellMgr.cpp DR groups (294-330). Not read: Spell::cast() body and the summon, charm, fear and taunt effect handlers; CalcDispelChance; the per-group values in GetDiminishingReturnsLimitDuration; CalculateLevelPenalty; the mana flat-rate computation in UpdateManaRegen; the aura application pipeline; SpellInfoCorrections.cpp; learning and spellbook tables. camera_scope: not a camera cell. Confidence: high on the DR ladder, the resist and hit rolls, the pushback rule and the cost and cast-time formulas (read in full). Medium on the cast pipeline as a whole. Depth thin overall: the sub-mechanisms above were read; summons, dispel chance, spellbook and the rest were not. 127 receipts in receipts.tsv, verifier passed.

Best transferable idea: One diminishing-returns ladder per target and group (100%, 50%, 25%, immune, reset after 15 s with no active aura), plus one roll checked against cumulative bands (miss, then resist, then hit), gives a readable crowd-control and hit model that a fast duel can run on the server.
Decision (proposed): adapt. Keep the ladder numbers and the single-roll bands; change the source rule, because the donor skips the ladder for NPC and boss casters and Frankendom's ruling is one CC ladder for any source.
Acceptance: Server test: a player stunned by an NPC, then stunned again by another source within 15 s, gets 50% duration; a third stun gets 25%; a fourth applies no aura. After 15 s with no active stun on that group the next stun is full length again.

## 1. Mechanism

Casting (order of steps as the code runs):
- (a) `Spell::prepare` stores targets, runs the CanPrepare script hook, sets the state to PREPARING, computes the power cost (`m_powerCost = ...CalcPowerCost`, Spell.cpp 3629), then runs `CheckCast(true)`. If that fails the cast is finished with the error (block at 3635-3636). The cast time is computed only after that first check (3661-3662), so a failed check does not spend charges (the donor comment says so at 3661).
- (b) Movement. In `update`, a player caster whose cast has a timer, has the MOVEMENT interrupt flag, is PREPARING, and is not a melee swing, autorepeat or triggered cast is cancelled (4544-4552). Instant spells are not cancelled because the timer is zero.
- (c) Timer. PREPARING counts the timer down by elapsed ms (4560-4562). At zero, and not a melee or autorepeat, `cast()` fires (4566). Instant spells (cast time 0) skip the timer and cast inside prepare (comment at 4567).
- (d) Damage during a cast (`Unit::DealDamage` path). A direct hit on a player whose generic spell is PREPARING: if the spell has ABORT_ON_DMG, the cast is interrupted (1314-1316); if it has PUSH_BACK, `Delayed()` is called (1318-1320). The push-back branch only runs for player victims (1305). A hit that is fully absorbed to zero also aborts an ABORT_ON_DMG cast (1052-1057). A channel with CHANNEL_FLAG_DELAY calls `DelayedChannel()` (1328-1330).
- (e) Pushback `Delayed()`. Order: `isDelayableNoMore()` (8113) returns true after two pushes (Spell.h 654), otherwise it spends one slot (657). Then the NO_PUSHBACK attribute check (8116). The base delay is 500 ms (8124). The reduction is the player spellmod plus the aura REDUCE_PUSHBACK. If the reduction reaches 100% the function returns (8128-8131). Otherwise the remaining time grows by the reduced delay, clamped to the full cast length (8133).
- (f) Cost. `CalcPowerCost` (2829-2900): flat `ManaCost` (2850), plus a percent of base or max pool when `ManaCostPercentage` is set (2852-2861), plus a school-keyed caster modifier. ATTR1 USE_ALL_MANA drains the whole pool (2837-2843). Cost is taken at cast time by `TakePower` (5482, not read).
- (g) Cast time. `CalcCastTime` reads the SpellCastTimes table by `CastingTimeIndex` (SpellInfo.cpp 819, 2784). Ranged-slot spells that are not autorepeat add 500 ms (2785-2786). Caster mods run last (ModSpellCastTime, not read).
- (h) Global cooldown. `TriggerGlobalCooldown` (9234) starts from `StartRecoveryTime`. Inside the 1000-1500 ms range it applies a spellmod (9255), a haste scale for one category (not read in detail), and a clamp to [1000, 1500] (9209-9210). Outside the range the raw value is kept. Per spell, the cooldown is the larger of `RecoveryTime` and `CategoryRecoveryTime` (2826).

Hit and resist for magic schools (`WorldObject::MagicSpellHitResult`, Object.cpp 3534-3670; reached from the two `SpellHitResult` overloads at 3738 and 3824 after their immunity and positive-spell checks, which were only partly read):
- (i) Hit chance = base hit percent x 100 plus the caster's hit modifier, clamped to 100..10000 basis points (3604-3618).
- (j) One roll `rand` in 1..10000 (3625) is checked against bands in order. Miss if `rand < 10000 - HitChance` (3623-3627). Then the band grows by the mechanic resist, the debuff resist (non-positive spells only) and, for binary spells, `GetEffectiveResistChance x 10000` (3631 and following). Resist if `rand` is below the grown band (3659-3660). Deflect (target in front arc) uses the same roll with one more band (3666-3667). One roll, cumulative bands.
- (k) Resist value. `GetResistance(mask)` returns the LOWEST resist among the schools in the mask (Unit.cpp 15884-15895). `GetEffectiveResistChance` (2302-2337) adds the caster's penetration and target-resist modifiers and, for non-binary spells, `max(0, 5 x (victim level - caster level))`. The constant C is 50 for level 20 or less, `50 + (lvl - 20) x 2.5` up to 60, and `150 + (lvl - 60)(lvl - 67.5)` above 60 (2327-2335; the above-60 line is 2331). The chance is `min(R / (R + C), 0.75)` (2337).
- (l) Partial resist (`CalcAbsorbResist`, 2340-2390). Only for non-physical schools, and not for holy damage on players. The average resist chance picks one of 11 bins (0 to 100% in 10% steps) with weight `max(0, 0.5 - 2.5 |0.1 i - avg|)` (2361). At avg <= 0.1 bins 0 to 2 are overridden (2366-2369). The chosen bin resists `damage x i / 10` (2380).

Physical spell damage (school NORMAL) goes through armour: `CalcArmorReducedDamage` (2229-2299). Soak ratio `t = 0.1 x armor / (8.5 x levelModifier + 40)`, then `t / (1 + t)`, capped at 0.75 (2291-2296), result `ceil(damage x (1 - t))` (2299). Spell damage with a physical school calls it at Spell.cpp 3019-3020.

Dispel (`Spell::EffectDispel`, SpellEffects.cpp 2704-2760). The mask comes from the effect's MiscValue. The loop runs `damage` times (the dispel count) (2730). Each pass picks a random aura from the list (2730-2736 region), rolls `CalcDispelChance` (2736, not read). A zero chance removes that aura from the list. Patch note: auras with 100% dispel resistance are not attempted (2737).

Diminishing returns (CC ladder). Per target and per DR group (taunt, stuns, cyclone, charge are DRTYPE_ALL; the other groups are DRTYPE_PLAYER, SpellMgr.cpp 294-310):
- (m) Read. `m_diminishLevel = unit->GetDiminishing(group)` (Spell.cpp 3201). No entry = level 1 (full). An entry with `hitCount` 0, or with `hitTime` 0, also reads full. If the stack of active auras in the group is 0 and more than 15000 ms have passed since the last removal, reset to full (Unit.cpp 11360-11370). The stamp is set when the stack reaches 0 (11486-11487) and when the entry is created (11390).
- (n) Advance. `IncrDiminishing` runs at the hit (Spell.cpp 3211-3213) only when the caster is player-controlled (`IsCharmedOwnedByPlayerOrPlayer`, 3211). It is skipped for self-casts (3196) and for world-boss casters (3198-3200). A new entry starts at level 2 (`hitCount` 1, Unit.cpp 11390); each later advance adds one, capped at that group's own maximum (`GetDiminishingReturnsMaxLevel(group)`, SpellMgr.cpp 313; IMMUNE only for groups whose maximum is IMMUNE). The ladder advances only if the DR type allows it: for DRTYPE_PLAYER groups only when the TARGET is player-controlled (or has the all-diminish creature flag, or for taunt the obeys-taunt flag); DRTYPE_ALL groups (taunt, stun, cyclone, charge) advance for any target (Spell.cpp 3207-3213). So the donor gates on target type as well as caster type.
- (o) Duration. `ApplyDiminishingToDuration` (11393-11468): a PvP cap sets duration to `limitduration` when the target is a player (or a creature with the all-diminish flag) and the source is a player (11403-11406; the comment says 10 s, the per-group values come from `GetDiminishingReturnsLimitDuration`, not read). Then `duration = int32(duration x mod)` (11468), mod 1.0, 0.5, 0.25 and 0.0 for levels 1, 2, 3 and immune (11455-11461). Duration 0 means the aura is not applied.
- (p) Stack. `ApplyDiminishingAura` (11472-11490): apply adds one to the group stack (called from SpellAuras.cpp 2889); removal subtracts one and stamps the time when the stack reaches 0.

Spell damage bonus (`Unit::SpellDamageBonusDone`, Unit.cpp 8507-8680, the direct branch read in full):
- (q) Coefficient from the table `spell_bonus_data` (loaded at SpellMgr.cpp 2302, looked up at 947) if a row exists (`direct_damage`, 8625-8641), else the effect's `BonusMultiplier`.
- (r) Spell power term: `DoneTotal += DoneAdvertisedBenefit x coeff x factorMod`, where `factorMod = CalculateLevelPenalty(spell) x stack` (8661-8670; the level penalty is not read). AP term: `ap_bonus x stack x ApCoeffMod x APbonus` (8647).
- (s) Final: `tmpDamage = (pdamage + DoneTotal) x DoneTotalMod` (8673), then spellmod flat and pct for damage or DoT.

Summons (partial). Each unit has a fixed array of summon slots `m_SummonSlot[MAX_SUMMON_SLOT]` (Unit.h 2085); the pet slot is `SUMMON_SLOT_PET` (Unit.h 725-726). `Unit::SetMinion` (Unit.cpp 7572) sets the owner GUID, inserts the minion in `m_Controlled`, and for player owners sets the player-controlled flag. Slot counts, leash, upkeep and kill or loot credit are not read.

DoT ticks (`GetMaxTicks`, SpellInfo.cpp 2794-2821). Duration 0 returns 1 tick (2797). Duration is capped at 30000 ms (2801). If a periodic damage, heal, leech or client-trigger (`PERIODIC_TRIGGER_SPELL_FROM_CLIENT` only) aura with nonzero amplitude exists, ticks = duration / amplitude (2814). Otherwise 6 (2821).

Regen (Player.cpp 1801-1990, partly read). `RegenerateAll` calls `Regenerate(POWER_MANA)` (1811). Mana in `Regenerate` uses the interrupted-regen flat modifier when `IsUnderLastManaUseEffect()` is true (1918), otherwise the normal flat modifier, both times the rate and the tick ms (the multiply lines after 1918 were not receipted). Mana's flat rate is computed in `UpdateManaRegen`, which was not read (comment at 1968). Rage and runic power decay outside combat (not read in detail).

## 2. Key functions

- `Spell::prepare`: `/mnt/frankendom-donors/azerothcore-azerothcore-wotlk/src/server/game/Spells/Spell.cpp` 3556-3670 (cost, check, cast time).
- `Spell::update`: same file 4525-4611 (movement cancel, PREPARING timer, CASTING timer).
- `Spell::Delayed`: same file 8100-8140 (push-back, two slots, 500 ms).
- `isDelayableNoMore`: `/mnt/frankendom-donors/azerothcore-azerothcore-wotlk/src/server/game/Spells/Spell.h` 652-659.
- DealDamage interrupt and pushback: `/mnt/frankendom-donors/azerothcore-azerothcore-wotlk/src/server/game/Entities/Unit/Unit.cpp` 1040-1060 and 1300-1330.
- `Unit::GetDiminishing`, `IncrDiminishing`, `ApplyDiminishingToDuration`, `ApplyDiminishingAura`: same Unit.cpp 11353-11490.
- `WorldObject::MagicSpellHitResult`: `/mnt/frankendom-donors/azerothcore-azerothcore-wotlk/src/server/game/Entities/Object/Object.cpp` 3534-3670.
- `Unit::GetEffectiveResistChance`, `CalcAbsorbResist`: Unit.cpp 2302-2390. `CalcArmorReducedDamage`: Unit.cpp 2229-2299.
- `Unit::SpellDamageBonusDone`: Unit.cpp 8507-8680. `SpellInfo::CalcPowerCost`, `CalcCastTime`, `GetMaxTicks`, `GetRecoveryTime`: `/mnt/frankendom-donors/azerothcore-azerothcore-wotlk/src/server/game/Spells/SpellInfo.cpp` 2778-2900 and 2794-2827.

## 3. Numbers vs mechanism

Table rows (name | effect | formula | number ranges | cost, cast time, cooldown | caps | file:line):

| name | effect | formula | number ranges | cost / cast time / cooldown | caps | file:line |
|---|---|---|---|---|---|---|
| Pool cost | pay on cast | `ManaCost` + pct of base or max + school modifier | flat int row; pct row; drain-all flag | row | none | SpellInfo.cpp 2850-2861 |
| Cast timer | countdown, cast at 0 | `m_timer -= elapsed ms`; instant = cast in prepare | ms from SpellCastTimes table (values not read) | cast time = table value | none | Spell.cpp 4560-4568; SpellInfo.cpp 2784-2786 |
| Movement cancel | player cast cancelled on move | flag 0x01 and PREPARING and timer != 0 | 1 flag bit | n/a | not for melee, autorepeat, triggered | Spell.cpp 4544-4552; SpellDefines.h 34 |
| Abort on damage | cast killed by a direct hit | flag 0x10 | 1 flag bit | n/a | player victims only; absorbed-to-zero hit also aborts | Unit.cpp 1314-1316, 1052-1057; SpellDefines.h 38 |
| Pushback | +delay per hit | `500 x (1 - reduce%)` ms | 500 ms base; reduce 0..100% | n/a | max 2 pushes; clamped to cast length; players only | Spell.cpp 8113-8133; Spell.h 654-657; Unit.cpp 1305 |
| Global cooldown | GCD after a cast | start recovery, clamped | 1000-1500 ms | 1.0-1.5 s | clamp [1000, 1500] when in range | Spell.cpp 9209-9255 |
| Cooldown | per-spell lock | `max(RecoveryTime, CategoryRecoveryTime)` | row ms | row | none | SpellInfo.cpp 2826 |
| Hit roll | miss, resist, hit from one roll | bands on rand in 1..10000 | hit 100..10000 bp | n/a | deflect band after | Object.cpp 3604-3667 |
| Resist chance | chance to resist a magic hit | `min(R / (R + C), 0.75)` | C = 50 / 50+2.5(lvl-20) / 150+(lvl-60)(lvl-67.5) | n/a | 0.75 cap | Unit.cpp 2302-2337 |
| Level gap resist | extra resist when target is higher level | `5 x (victim lvl - caster lvl)` | 0 or more | n/a | non-binary spells only | Unit.cpp 2323 |
| Partial resist | damage resisted in 10% steps | 11 bins, weight `0.5 - 2.5|0.1 i - avg|` | 0..100% | n/a | magic schools only | Unit.cpp 2356-2380 |
| Armour soak | physical spell or hit | `t = 0.1 armor / (8.5 lvl_mod + 40)`, `t/(1+t)` | cap 0.75 | n/a | 0.75 | Unit.cpp 2291-2299 |
| DR ladder | later CC shorter | duration x mod | mod 1, 0.5, 0.25, 0 | n/a | 4 levels per target per group | Unit.cpp 11353-11468 |
| DR reset | ladder forgets | 15000 ms after last removal, stack 0 | 15 s | n/a | only when no active aura | Unit.cpp 11360-11370, 11486-11487 |
| PvP CC cap | CC limited on player target | `duration = limit` | comment: 10 s; per-group values not read | n/a | player vs player | Unit.cpp 11403-11406 |
| Dispel | remove N auras | N = damage; random pick; roll per aura | count per row | n/a | 100% resist auras skipped | SpellEffects.cpp 2730-2737 |
| DoT ticks | periodic ticks | `min(duration, 30 s) / amplitude` | cap 30000 ms; default 6 | n/a | 30 s | SpellInfo.cpp 2801-2821 |
| Spell power | damage from gear and auras | `(base + spellpower x coeff x levelpen x stack + AP term) x mod` | coeff from table or BonusMultiplier | n/a | level penalty not read | Unit.cpp 8625-8673 |
| Mana regen | pool refill | per RegenerateAll tick; recent-cast branch | rate from flat modifier; not read | n/a | 5-s-style recent-cast flag (constant not read) | Player.cpp 1811, 1918 |

Which numbers suit a fast mobile fight: the DR ladder (100/50/25/immune, 15 s reset) and the two-push pushback suit it directly. The 1.0-1.5 s GCD window suits a phone duel. The cast times live in the SpellCastTimes table, which was not read, so no cast-time range is claimed. A 500 ms push on a phone-sized cast is a large fraction of a short cast; keep it as data.

## 4. TypeScript sketch

simplified: keeps the donor order for the ladder (read the level, then land the hit, then apply and remove auras by stack), the resist constant and partial bins, the single-roll miss-then-resist bands, and the 500 ms pushback with two slots. Omitted: the caster and boss exemptions (any source counts, as Frankendom rules), the level-gap resist bonus, the lowest-school resist, attacker ignore-resist auras, mechanic and debuff resist terms, the deflect band, per-group PvP limits, the NO_PUSHBACK attribute, cast-item and channel branches, and spellmod cast-time scaling. Reordered on purpose: `pushback` checks for a zero push before spending a slot (the donor spends the slot first; see section 6).

```ts
// Licence: GPL-2.0 (donor). Clean-room sketch written from the described mechanism, not a translation of the donor lines.

// --- 1. Diminishing returns ladder: one entry per (target, group), any source ---
export type DrLevel = 0 | 1 | 2 | 3; // 0 = full, 1 = half, 2 = quarter, 3 = immune
const DR_MULT: readonly number[] = [1, 0.5, 0.25, 0]; // fixed engine rule
const DR_RESET_MS = 15000;                              // fixed engine rule: reset after 15 s with no active aura
const PVP_CC_CAP_MS = 10000;                            // donor comment says 10 s; per-group values not read

interface DrEntry { hitCount: number; stack: number; stampMs: number; }

export class DrLadder {
  private groups = new Map<string, DrEntry>();

  // Level read when a CC is about to land. Read only, except the reset.
  level(group: string, nowMs: number): DrLevel {
    const e = this.groups.get(group);
    if (!e || e.hitCount === 0) return 0;
    if (e.stack === 0 && nowMs - e.stampMs > DR_RESET_MS) { e.hitCount = 0; return 0; }
    return Math.min(e.hitCount, 3) as DrLevel;
  }

  // Called after the level was read. The first landing creates the entry at hitCount 1, so the next application reads half.
  // maxLevel is per group in the donor (GetDiminishingReturnsMaxLevel), not always 3 (immune): store it on the group row.
  // The caller also decides whether this target type may advance the group (donor: DRTYPE_PLAYER groups only on player-controlled targets).
  land(group: string, nowMs: number, maxLevel: DrLevel = 3): void {
    const e = this.groups.get(group);
    if (!e) { this.groups.set(group, { hitCount: 1, stack: 0, stampMs: nowMs }); return; }
    if (e.hitCount < maxLevel) e.hitCount += 1;
  }

  applied(group: string): void {
    const e = this.groups.get(group);
    if (e) e.stack += 1;
  }

  removed(group: string, nowMs: number): void {
    const e = this.groups.get(group);
    if (e && e.stack > 0) {
      e.stack -= 1;
      if (e.stack === 0) e.stampMs = nowMs; // the 15 s window starts when the last aura ends
    }
  }
}

// Duration after the ladder. The caller sets pvpCap when the source is a player and the target is a
// player (or a creature with the all-diminish flag). Donor: Unit.cpp 11403-11404.
export function ccDurationMs(baseMs: number, level: DrLevel, pvpCap: boolean): number {
  const capped = pvpCap ? Math.min(baseMs, PVP_CC_CAP_MS) : baseMs;
  return Math.floor(capped * DR_MULT[level]); // 0 means the aura is not applied
}

// --- 2. Resist chance R / (R + C), capped at 0.75, with partial-resist bins ---
export function resistConstant(casterLevel: number): number {
  if (casterLevel > 60) return 150 + (casterLevel - 60) * (casterLevel - 67.5);
  if (casterLevel > 20) return 50 + (casterLevel - 20) * 2.5;
  return 50;
}

export function resistChance(resist: number, casterLevel: number): number {
  const r = Math.max(resist, 0);
  return Math.min(r / (r + resistConstant(casterLevel)), 0.75);
}

// Probabilities that 0,10,...,100 percent of the hit is resisted (11 bins).
export function partialBins(avg: number): number[] {
  const p = Array.from({ length: 11 }, (_, i) => Math.max(0, 0.5 - 2.5 * Math.abs(0.1 * i - avg)));
  if (avg <= 0.1) { p[0] = 1 - 7.5 * avg; p[1] = 5 * avg; p[2] = 2.5 * avg; }
  return p;
}

export function pickBin(probs: number[], u01: number): number {
  let acc = probs[0];
  let i = 0;
  while (u01 >= acc && i < 10) { acc += probs[++i]; }
  return i; // damage resisted = damage * i / 10
}

// --- 3. One roll checked against cumulative bands: miss, then resist ---
// hitChanceBp and resistBp are basis points (1 = 0.01 percent).
export function hitRoll(hitChanceBp: number, resistBp: number, rnd01: number): "miss" | "resist" | "hit" {
  const hit = Math.min(Math.max(hitChanceBp, 100), 10000);
  const roll = 1 + Math.floor(rnd01 * 10000); // 1..10000
  let band = 10000 - hit;
  if (roll < band) return "miss";
  band += resistBp;
  if (roll < band) return "resist";
  return "hit";
}

// --- 4. Cast pushback: +500 ms per hit, reduced by aura %, at most 2 pushes ---
export interface CastTimer { remainingMs: number; castMs: number; pushes: number; }

export function pushback(c: CastTimer, reducePct: number): void {
  const add = Math.floor(500 * (1 - Math.min(Math.max(reducePct, 0), 100) / 100));
  if (add <= 0 || c.pushes >= 2) return; // fix: check first, spend a push only when one applies
  c.pushes += 1;
  c.remainingMs = Math.min(c.remainingMs + add, c.castMs);
}

export {};
```

## 5. Lands in

- TARGET `src/fight/cc-ladder.ts` (new module: the CC ladder, the hit and resist bands, and the cast pushback rule, all engine-side). Parity-checklist row 13 (specials). The hint on the list said row 22 (Pit-only); that row does not fit, because the ladder and the bands must run in the engine for the Pit and zones alike. Flagged for Lead.
- today: no magic module in `src/fight/` read here; the Pit and zone spell code was not checked.
- Reuse tag: rewrite-from-idea (GPL-2.0; clean-room, the numbers are design values, no code copied)
- Brief rule served: 1 (one engine, two clients: the ladder and bands are engine rules, not per client); the donor's per-source exemptions are not adopted.

## 6. Gaps and risks

- GPL-2.0: clean-room only. The sketch is written from the mechanism. The numbers (100/50/25, 15 s, 500 ms, two pushes, the resist constant and 0.75 cap) are design values recorded with their donor line, not code.
- Target rule (kept from the donor, easy to miss): a DRTYPE_PLAYER group advances only when the target is player-controlled; taunt/stun/cyclone/charge (DRTYPE_ALL) advance on any target. Frankendom's any-source ruling changes the caster side only; the per-group target gate and per-group maximum level should be data fields on the group row.
- Defect: `Spell::Delayed` calls `unitCaster->ToPlayer()->ApplySpellMod` unguarded (null deref for a creature caster); the only protection is the player-victim guard at Unit.cpp 1305. Fix: guard in Delayed itself (the sketch is pure, so it has no such path).
- Source rule (adapt): the donor advances the ladder only for player-controlled casters (Spell.cpp 3211) and skips world bosses (3198-3200). Frankendom rules one ladder for any source, so an NPC stun counts. This is the main change.
- Defect in the pushback counter, kept with a fix: `isDelayableNoMore` increments the counter (Spell.h 657) before the NO_PUSHBACK check (Spell.cpp 8116) and the 100%-reduction return (8128-8131). A push that adds nothing still spends one of the two slots. Fix: the sketch returns before spending a slot.
- Pushback is players only (Unit.cpp 1305, comment "does not support creature push_back"). A mob cast is not pushed back in the donor. Frankendom must choose: keep players only, or make pushback a per-spell data flag.
- Absorbed hits cancel casts (Unit.cpp 1052-1057): a hit fully absorbed to zero still aborts an ABORT_ON_DMG cast. Check this against row 3 (guard, parry, stamina) before adopting: a blocked hit should probably not cancel a cast.
- MAX_ATTACKERS = 3: three attackers landing a stun on one target in the same tick would walk the ladder from 100% to 25% at once with the donor's per-landing rule. The donor has no simultaneous-landing rule (not read elsewhere). Frankendom must decide; see ruling 2.
- Server authority: the donor reads the ladder and resolves the hit on the server inside the same call. The sketch keeps the same order (read, then land), which a server-side test can pin.
- One ledger: the ladder lives on the target unit, not the spell or the client. That matches the one-ledger ruling.
- Not read, so not claimed: summon limits and leash, dispel chance, per-group PvP limit values, level penalty, mana flat rate, cast-time table values, spellbook learning. Depth is thin for the whole spell pipeline.
- Frankendom has no spell-level resource pool split into four bars yet. Donor pools are one per power type (PowerType enum), with max values from stats (not read). Keep health, stamina, mana and focus as character data row fields.

Rulings for Dom (the questions Dom must decide, each with a recommendation):
1. Should an NPC's or a boss's stun advance a player's ladder? Recommendation: yes, one ladder for any source, as Strategy ruled. The donor says no (Spell.cpp 3198-3211).
2. If three attackers land a CC in the same tick, is that one ladder step or three? Recommendation: one step per target per group per tick, so immunity cannot arrive in a single exchange.
3. Should a fully blocked or parried hit cancel a player's cast? Recommendation: no. Only landed damage cancels a cast (donor: Unit.cpp 1052-1057 says yes).

## 7. Pass-2 additions

As-data shape:
- Table: `spell_dbc` in `data/sql/base/db_world/spell_dbc.sql` (CREATE TABLE at line 23; a mirror of the client spell DBC; primary key ID; about 235 columns (lines 24-258)). Lookup tables by index are client DBC tables (SpellCastTimes, SpellRange, SpellDuration, SpellRadius), not in this file; the names appear in SpellInfo.cpp (819) but their rows were not read.
- Row fields used by the mechanisms above (name: type, unit):
  - ID: int; Category: int; DispelType: uint (dispel type enum); Mechanic: uint.
  - Attributes, AttributesEx..AttributesEx7: uint flag bits (SPELL_ATTR flags).
  - Targets: uint bitmask (line 40); MaxTargets: uint (236).
  - CastingTimeIndex: uint, index into SpellCastTimes, ms (52).
  - RecoveryTime: uint ms (53); CategoryRecoveryTime: uint ms (54); StartRecoveryTime: uint ms, GCD (230).
  - InterruptFlags: uint flags (55); AuraInterruptFlags: uint; ChannelInterruptFlags: uint.
  - PowerType: int, power enum (65); ManaCost: uint (66); ManaCostPerLevel: uint (67); ManaPerSecond: uint (68).
  - RangeIndex: uint, index into SpellRange; Speed: float.
  - Reagent_1..8: int item ids; ReagentCount_1..8: int.
  - Effect_1..3: uint effect id (95); EffectDieSides_1..3: int random range (98); EffectRealPointsPerLevel_1..3: float per-level points (101); EffectBasePoints_1..3: int (base value); EffectRadiusIndex_1..3: uint (116); EffectAura_1..3: uint aura type (119); EffectAuraPeriod_1..3: uint tick ms (122); EffectMultipleValue_1..3: float (125).
  - Also: ProcChance, ProcCharges, ProcFlags and related proc fields, not read in detail.
- Second table: `spell_bonus_data` (entry, direct_bonus, dot_bonus, ap_bonus, ap_dot_bonus), loaded at SpellMgr.cpp 2302. It is the spell-power and AP coefficient per spell.
- Table-driven: yes for cost, cast time index, cooldowns, interrupt flags, effect and aura ids, periodic tick period, and per-level scaling. Per-spell special rules sit in code: SpellInfoCorrections.cpp exists (not read) and the effect and aura handlers (SpellEffects.cpp, SpellAuraEffects.cpp) are keyed by those ids.
- A new spell is one row: yes for a spell built from existing effect and aura types (cost, cast time, cooldowns, values, coefficients). No for a new behaviour, because each effect and aura id maps to a C++ handler, so a new behaviour needs code.
- Scaling fields: EffectRealPointsPerLevel and ManaCostPerLevel (per level), spell_bonus_data coefficients (per spell power and AP). Level penalty is in code (not read).

Provenance per claim: repo `/mnt/frankendom-donors/azerothcore-azerothcore-wotlk` (AzerothCore), licence GPL-2.0 per LICENSE (line 1-2). Every number and claim in this note has a receipt in `receipts.tsv` (127 rows, verifier passed). Copyleft: shape only, no line-by-line translation. The contract shape (row fields) is data and is described, not copied.

What they patched later (no git history in the box: /mnt/frankendom-donors/azerothcore-azerothcore-wotlk has no .git, so commit messages are not available). In-code markers:
- PvP CC limit, 2.2.0 (Unit.cpp 11403).
- Dispel and 100% dispel resist, 2.4.3 patch note (SpellEffects.cpp 2737).
- Faerie Fire PvP limit, 3.1 (SpellMgr.cpp 334).
- Resist constant from EJ research (Unit.cpp 2325).
- Xinef-tagged fixes: no DR on self-cast (Spell.cpp 3196); no DR for world bosses (3198); preparing-state check for real casts (4544); removed a GCD check (3794); channel target list not updated on the last tick (4595).
- Limitation, not a fix: pushback does not support creatures (Unit.cpp 1305).
- Defect found in this read, not marked by the donor: the push counter is spent before the zero-push check (Spell.h 654-657 with Spell.cpp 8113-8131). Recorded in section 6.

Rulings for Dom: three, in section 6 above.

## Checker findings (Sonnet 5.5 medium, 2026-10-12)
Verdict: MINOR
- "capped at IMMUNE (11386)": the cap is GetDiminishingReturnsMaxLevel(group), per group (fixed in the mechanism and the sketch: land() takes maxLevel).
- DR advance condition omitted the target gate: DRTYPE_PLAYER groups advance only for a player-controlled target (or all-diminish flag); DRTYPE_ALL groups for any target (added).
- GetDiminishing also returns level 1 when hitTime == 0 (added).
- GetMaxTicks: returns 1 when duration is 0; the trigger case is PERIODIC_TRIGGER_SPELL_FROM_CLIENT only (fixed).
- Licence: source headers say "or later" (added).
- Missed: Delayed() unguarded ToPlayer()->ApplySpellMod (added as a defect line); target-type gating of DR (added as a gap line).
Fixed 2026-10-12: items above; sketch DrLadder.land gets a maxLevel parameter (default 3), mirrored in work/azeroth-dr-resist-pushback.ts.
