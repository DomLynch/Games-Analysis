# TrinityCore-TrinityCore (status-effects, batch 3, SE005)

Donor: /mnt/frankendom-donors/TrinityCore-TrinityCore/ (VPS, read-only). Depth: full (server half).
Licence: GPL 2.0 (COPYING line 1; README; AUTHORS says all code is GPL 2.0 except bundled third-party libraries). Treated as GPL: clean-room, shape only. Nothing adapted. Row data in sql/ has no stated origin (class C). Asset audit AU053 read first.
Checked: src/server/game/Entities/Unit/Unit.cpp (GetDiminishing, IncrDiminishing, ApplyDiminishingToDuration, ApplyDiminishingAura, HasStrongerAuraWithDR, SetControlled, ApplyControlStatesIfNeeded, SetStunned, damage interrupt path, _TryStackingOrRefreshingExistingAura); src/server/game/Spells/Spell.cpp (hit path around 3170 to 3215; cast path around 3802 inside _cast); src/server/game/Spells/SpellInfo.cpp (_LoadSpellDiminishInfo group, type, max-level and limit functions, 2995 to 3458); src/server/game/Spells/Auras/SpellAuras.cpp (ModStackAmount, RefreshDuration, CanStackWith header); src/server/game/Spells/Auras/SpellAuraEffects.cpp (HandleAuraModStun); src/server/game/Miscellaneous/SharedDefines.h (Mechanics, DiminishingGroup, DiminishingReturnsType, DiminishingLevels). Confidence high for the paths listed; no build, no tests, no runtime.
Half read: SERVER (src/server). The data half is NOT in the box: spell effect and aura option rows are client DB2 files (not in the box); sql/ holds world and auth schema (not read for spell rows). Named pair: none in the box.

## 1. What the player sees and feels
Not read: no client, UI or sound files are in the box, so this is inferred from the server state. A stunned unit gets its stunned flag, stops moving and drops its target. Stun also roots it, and a stunned unit cannot be confused or feared on top of it (the stronger state wins). Repeated crowd control on one target gets shorter: full, then half, then a quarter, then nothing, with the step resetting 18 seconds after the last such effect ends. At 375 wide, this means the third attacker's stun reads as short and the next one does not land at all, which is a countable beat if the client shows it. Not read.

## 2. Why it works, or is striking
- Readable beat: the diminishing level is a small discrete step (full, half, quarter, immune), countable at 375 wide.
- Signature behaviour: a crowd-control family bucket (root, stun, incapacitate, disorient, silence, knockback, taunt) with a bounce rule: a shorter new aura cannot overwrite a longer one in the same bucket.
- Signature sound or effect: not read.
- Could be ours at 20 to 30 percent resemblance: yes. The bucket, the four-step ladder and the bounce rule are a small rule set that re-expresses cleanly.

## 3. The rule behind it
Order of operations at spell hit (Spell.cpp, lines 3183 to 3214):
1. Read the current level for the target's group (line 3183), before any bump.
2. Bump the level for the next hit (line 3187), only when the group type is all (stun, taunt) or the target is player-affected (the other groups).
3. Take the aura duration (spell value, or the spell's max duration).
4. Caster is a player and target is player-affected: cap the duration at the group's PvP limit (Unit.cpp lines 9386 to 9388; default 8 s from SpellInfo.cpp line 3454).
5. Multiply by the level's percent (Unit.cpp lines 9377 to 9451). Zero means immune: an aura-only spell misses with SPELL_MISS_IMMUNE (Spell.cpp line 3214).

Level percents (Unit.cpp):
- Default groups (root, stun, incapacitate, disorient, silence): 100, 50, 25, then immune at level 3 (lines 9441 to 9443). Limit-only has type NONE, so it gets the duration cap and no percent step.
- AOE knockback: 100, then immune at level 2 (line 9425; max level 2 from SpellInfo.cpp line 3388 onward).
- Taunt, for creature targets that obey taunt diminishing: 100, 65, 42.25, 27.46 percent, then immune (lines 9406 to 9409; 0.4225 at line 9407).

Reset and bounce:
- Level resets when no aura of the group is active and 18 seconds have passed since the last one was removed (Unit.cpp line 9357; the removal time is set in ApplyDiminishingAura, around line 9468).
- Bounce (Spell.cpp line 3802, in _cast; Unit.cpp HasStrongerAuraWithDR from line 4914): a new aura in the same bucket whose post-diminish duration is shorter than the running aura's duration is refused with SPELL_FAILED_AURA_BOUNCED (line 4927 is the comparison).

Groups and types (SpellInfo.cpp): group is set per spell by a hand-written table (from line 2997); type is stun and taunt = all targets, every other group = player-affected only (line 3373 onward); default group is NONE (line 3370); the limit table gives explicit PvP caps (3 s Dragon's Breath and Binding Shot, 4 s Cripple, Paralysis and Imprison, 6 s Wyvern Sting) and 8 s for everything else in a group (line 3454).

Control priority (Unit.cpp, SetControlled lines 11631 onward; ApplyControlStatesIfNeeded from line 11712): stun beats root, root beats confuse, confuse beats fear. Applying stun also roots (SetStunned). A state is not cleared while another aura of the same type still applies (apply false returns early when SPELL_AURA_MOD_STUN is still present). A stun also re-evaluates threat suppression (SpellAuraEffects.cpp lines 3177 to 3179).

Damage and interrupts (Unit.cpp lines 876 to 883): damage removes auras with the Damage interrupt flag before the absorb check, so an absorbed hit still breaks them.

Stacks: an aura with a stack cap clamps its stack count (SpellAuras.cpp lines 1093 to 1106; a non-stackable aura is set to 1); a stack increase refreshes the timers and resets charges when the new stack is not lower (line 1114; RefreshDuration from line 952). Same spell and same caster in one slot merge into the existing aura (Unit.cpp lines 3405 to 3462): base amounts add when the effect has the points-stack attribute, else replace.

Mechanics (SharedDefines.h lines 2868 to 2908): 37 values (0 to 36, from none to taunted), including fear, root, stun, sleep, silence, bleed, knockout, disorient, horror, taunted. Used as tags by the data, not read.

Data fields (designer-tunable; donor values null because the licence is GPL and the values are not copied):
| name | unit | donor_value |
|---|---|---|
| dr_group | enum: root, stun, incapacitate, disorient, silence, knockback, taunt, limit-only | null |
| dr_type | enum: none, player-only, all | null |
| dr_levels | percent array per group, last entry 0 = immune | null |
| dr_reset | s, after the last aura of the group ends | null |
| pvp_cap | s, default and per-spell overrides | null |
| taunt_obeys_dr | bool, creature targets only | null |
| aura_stack_cap | count (0 = no cap) | null |
| control_priority | ordered list: stun, root, confuse, fear | null |

## Frankendom mapping
- Shape: 700 zones as data, 100 Pit characters reused across zones, many-vs-one, server-verified. The diminishing state lives on the target in the engine, not in the client; the client shows the level.
- Many-vs-one: three attackers (MAX_ATTACKERS = 3) can chain stuns on one boss in a few seconds. The bucket with the four-step ladder caps the chain and gives a clear end. Recommend for bosses and elites only (our call).
- Parity rows: the bucket state and bounce belong in row 1 (duel step and sim). The control priority is the same engine state, so it sits in row 1 too. The threat re-evaluation on stun maps to row 4 (aggro, chase, leash), which is the one link to threat. Damage-breaks-aura is in row 1.
- Target file: src/fight/status.ts (new module, one row: 1).
- Keep: the bucket per family; the discrete level ladder; the 18-second reset from the last removal; the bounce rule; the control priority; the damage-breaks rule.
- Change: our families (stun, root, knockdown, fear, silence, taunt, knockback); the per-spell hand table replaced by a group field on each ability row; a separate immune value (see defects).

## Defects and traps in the donor (keep the idea; fix in the sketch)
- T1, the enum alias. DIMINISHING_LEVEL_4 and DIMINISHING_LEVEL_IMMUNE are both 3 (SharedDefines.h line 7431). The taunt table uses 3 as a fourth level; the other tables use 3 as immune. Works, but it is a trap. Fix: separate values in our data; taunt gets its own four-step ladder.
- T2, no fallback for an unknown spell. The group comes only from a hand-written table; the default is NONE (SpellInfo.cpp line 3370). A new stun spell gets no bucket until someone adds its id. Fix: the group is a field on each ability row, so it cannot be missed silently.
- T3, the 8-second PvP cap is a default for every grouped spell (line 3454), not an explicit choice. Fix: caps are explicit per group in data; none by default.
- T4, the bounce compares unlike quantities: the existing aura's stored duration against the new aura's post-diminish max duration (Unit.cpp lines 4923 to 4927). Aura::GetDuration was not read, so whether it is remaining time is not verified. Fix: compare remaining with remaining, and say so in the data.

Sketch (typechecked on the VPS with npx tsc --noEmit --strict --target es2020: exit 0). Best transferable idea: a crowd-control bucket per family with four discrete levels, a reset 18 seconds after the last aura ends, and a bounce rule that refuses a shorter new aura.
simplified: omits the aura object and the per-target loop, the taunt creature branch, the PvP-only player check (passed in as a flag), and the rule that an immune result is an aura miss only for aura-only spells (the caller decides). It reads the level before bumping it, as the donor does, and treats a non-applicable target as level 0, which gives the same multiplier (1) as the donor. Nothing is reordered.
```ts
export {};
type Rule = { appliesToAll: boolean; percents: number[]; pvpCapMs: number };
type Group = { hits: number; active: number; clearedAtMs: number };
const RESET_MS = 18000;

export function levelOf(g: Group, nowMs: number): number {
  if (g.hits === 0) return 0;
  if (g.active === 0 && nowMs - g.clearedAtMs > RESET_MS) return 0;
  return g.hits;
}

export function onApply(g: Group): void {
  g.active += 1;
}

export function onRemove(g: Group, nowMs: number): void {
  g.active = Math.max(0, g.active - 1);
  if (g.active === 0) g.clearedAtMs = nowMs;
}

// Order at hit: read the level, bump it for the next hit, then scale this hit by the level that was read.
export function onHit(rule: Rule, g: Group, baseMs: number, nowMs: number, targetIsPlayer: boolean, pvp: boolean): { durationMs: number; immune: boolean } {
  const applies = rule.appliesToAll || targetIsPlayer;
  const read = applies ? levelOf(g, nowMs) : 0;
  if (applies && read < rule.percents.length - 1) g.hits = read + 1;
  const capped = pvp ? Math.min(baseMs, rule.pvpCapMs) : baseMs;
  const d = Math.floor((capped * (rule.percents[read] ?? 0)) / 100);
  return { durationMs: d, immune: d === 0 };
}

// A new aura that would last less than the one already running in the same group is refused.
export function bounces(existingRemainingMs: number, newDurationMs: number): boolean {
  return newDurationMs > 0 && newDurationMs < existingRemainingMs;
}
```

Decision: adapt (idea). The defects T1 to T4 are not copied; the sketch uses explicit data for the group, the cap and the immune value.

## 5. Five-minute look test (Dom, on the phone)
Build: one elite enemy in a fight with three attackers. Two variants on a 375-wide screen: (A) a flat 2 s stun from each attacker; (B) the bucket with 100, 50, 25 percent then an immune beat, with three small pips on the enemy's status bar and a "resists" flash on the immune step.
Judge: does B read as "the elite is hardening" rather than "stun is broken"? Are three pips legible next to the bar at 375 wide? Is the flash clear enough to show the immune end without a text line?

## 6. Licence and IP
Code: GPL 2.0 (COPYING; README). Shape only; the sketch was written from the rule, not copied from the source. Row data: origin not stated, not used here. No copyrighted text reproduced beyond short identifiers. Inspiration is category-level: "a crowd-control bucket per family with discrete levels and a bounce rule". No legal conclusion.

## 7. Gaps
- Not in the box: client DB2 spell and aura option rows; sql/ spell rows (not read).
- Not read: Aura::GetDuration and Aura::Update bodies (T4 unverified); SetStunned body beyond the root call; SetControlled removal branches for fear and confuse beyond the early-return lines; Player override of IsAffectedByDiminishingReturns (the Unit default counts only player-owned or charmed units); ClearDiminishings callers; CanStackWith body past line 1660; the other CC handlers (fear, confuse, silence, root) beyond the stun handler.
- Not read: client, UI, animation and sound. Visual and audio claims above are inferred.
- Not run: no build, no tests, no runtime.
- Half read: SERVER. The data half is not in the box. Named pair: none in the box.
- Not applicable here: idle and ambient behaviour, death and respawn presentation, loot reveal, walk density (not in this topic's server reads).
