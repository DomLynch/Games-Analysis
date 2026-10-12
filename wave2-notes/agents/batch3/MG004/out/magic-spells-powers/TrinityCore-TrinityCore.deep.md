# TrinityCore-TrinityCore (magic-spells-powers, cell 22)

Donor: `/mnt/frankendom-donors/TrinityCore-TrinityCore/src/server/game/Entities/Unit/Unit.cpp` | Licence: GPL-2.0 (repo `COPYING`: GNU GPL version 2, June 1991; clean-room, shape only) | C++ | symbol `Unit::ApplyDiminishingToDuration`

Checked: Read in full: `Unit::GetDiminishing`, `Unit::IncrDiminishing`, `Unit::ApplyDiminishingToDuration`, `Unit::ApplyDiminishingAura` (Unit.cpp 9350-9472), `Unit::HasStrongerAuraWithDR` (Unit.cpp 4914-4932), the hit code (Spell.cpp 3165-3222) and the cast bounce check (Spell.cpp 3795-3808, inside `Spell::_cast` at 3696), the DR type, max-level and limit lambdas (SpellInfo.cpp 3373-3461), the enums (SharedDefines.h 6640-6660, 7422-7434), `Unit.h` 380-400 and 698-703, and the aura register hooks (SpellAuras.cpp 2515-2532). Callers checked: `IncrDiminishing` has one caller (Spell.cpp:3187); `ApplyDiminishingToDuration` has two (Spell.cpp:3214, Unit.cpp:4926); `GetDiminishing` has three (Spell.cpp:3183, Unit.cpp:4917, Unit.cpp:9366). Confidence: high for the ladder, the reset window, the cap and the bounce. Not read: the per-spell group table in full (only parts of the Mage, Warrior, Warlock, Monk and Hunter branches), the taunt-flag definition (the flag test at Unit.cpp:9400 was read, its constant was not), `Aura::CalcMaxDuration`, and the cast-time and interrupt rules. This note covers only the crowd-control diminishing-returns ladder, one part of the magic topic.

## 1. Mechanism

- Each target (`Unit`) keeps one counter per diminishing group (stun, root, incapacitate, disorient, silence, knockback, taunt). The counter is a level (hit count) plus an active-aura count and the time the last aura in that group ended (Unit.h 380-400; Unit.cpp 9455-9470).
- Order of steps on a landed hit (Spell.cpp 3181-3216): (a) read the target's current level for the group (3183); (b) if the group type applies to this target, count the hit (3185-3187); (c) for a harmful aura, the duration is capped and then multiplied by the ladder (Unit.cpp 9374-9451); (d) if the result is 0 and every effect is an aura, the cast misses with `SPELL_MISS_IMMUNE` (3214-3216). The level is read before it is counted, so the first CC in a chain is always full length.
- Level lookup (Unit.cpp 9350-9361): level is the stored hit count. If no aura of the group is active and more than 18 s have passed since the last one ended, the level is 0 again. An active aura keeps the level, however long it lasts.
- Level step (Unit.cpp 9363-9372): the count goes up by one per landed hit, but never past the group's max level (default: immune).
- Duration (Unit.cpp 9374-9453): (a) if the duration is -1 or the group is `NONE`, nothing changes. (b) A PvP cap: when the target is a player (or a player's pet or charm) and the caster is a player, a duration above the spell's limit is set to the limit (9386-9392). The default limit is 8 s (SpellInfo.cpp 3454); some spells have their own limit (Binding Shot 3 s, SpellInfo.cpp 3422-3424). (c) The ladder multiplier is applied, but only when the group type applies to this target. The result is floored (9451).
- Bounce (Spell.cpp 3795-3804, only inside the `if (!skipCheck)` block of `Spell::_cast`, so instant casts that skip the check never bounce; Unit.cpp 4914-4932): before a new CC lands, the target's existing auras in the same group are checked. The new duration (after the same ladder) is computed. If it is above 0 and shorter than an existing aura's duration, the cast fails with `SPELL_FAILED_AURA_BOUNCED`.
- Group type (SpellInfo.cpp 3373-3390): stun and taunt are `DRTYPE_ALL` (diminished on every target, including NPCs). Every other group is `DRTYPE_PLAYER` (diminished only on players or on player-owned pets and charms, `Unit.h:698`). Positive spells are `NONE` (`diminishingGroupCompute`, SpellInfo.cpp 2999-3000). A separate `DIMINISHING_LIMITONLY` group (SharedDefines.h 6658) gets `DRTYPE_NONE` (3380-3381): the duration cap with no ladder.
- Aura hooks (SpellAuras.cpp 2517-2531): applying an aura adds one to the group's active count; removing it subtracts one, and when the count reaches 0 the end time is stored (Unit.cpp 9468).
- Tick: none. This is a per-hit lookup, not a loop. The clock is wall-clock game milliseconds (`GameTime::GetGameTimeMS`, Unit.cpp 9468), not a tick count.

## 2. Key functions

- `Unit::GetDiminishing`: `/mnt/frankendom-donors/TrinityCore-TrinityCore/src/server/game/Entities/Unit/Unit.cpp` 9350-9361. Returns the stored level, or 0 after 18 s with no active aura.
- `Unit::IncrDiminishing`: Unit.cpp 9363-9372. Steps the level up to the group max.
- `Unit::ApplyDiminishingToDuration`: Unit.cpp 9374-9453. Caps the duration (PvP limit), then multiplies it by the ladder for the level passed in. The stun, taunt and knockback branches have their own ladder rows (9396-9451).
- `Unit::ApplyDiminishingAura`: Unit.cpp 9455-9470. Active-count bookkeeping and the end-time stamp.
- `Unit::HasStrongerAuraWithDR`: Unit.cpp 4914-4932. The bounce check; it loops over the target's applied auras.
- Hit processing: `/mnt/frankendom-donors/TrinityCore-TrinityCore/src/server/game/Spells/Spell.cpp` 3165-3222 (enclosing function header not read). Cast bounce: Spell.cpp 3795-3808 (inside `Spell::_cast`, starts at 3696).
- Group table: `/mnt/frankendom-donors/TrinityCore-TrinityCore/src/server/game/Spells/SpellInfo.cpp` 2995-3050 (start of the group compute, not the full table), 3373-3461 (type, max level, limit lambdas).

## 3. Numbers vs mechanism

Table of mechanisms (cost, cooldown and cast time do not apply: these are passive rules on the target).

| name | effect | formula | number ranges | cost | cooldown / cast time | caps | file:line |
|---|---|---|---|---|---|---|---|
| Level counter | each landed CC in a group steps the level up | level = min(hits + 1, max) | 0 to 3 (default); 0 to 4 (taunt); 0 to 1 (knockback) | n/a | n/a | max level: immune (3); knockback stops at 1 | Unit.cpp:9371; SpellInfo.cpp:3388-3398 |
| Ladder, default groups | 2nd CC half length, 3rd quarter, 4th immune | duration = floor(base x mod) | mod 1.0, 0.5, 0.25, 0 | n/a | n/a | at 0 the cast misses (immune) | Unit.cpp:9440-9443, 9451; Spell.cpp:3214-3216 |
| Ladder, taunt | taunt on flagged creatures only | same | mod 1.0, 0.65, 0.4225, 0.274625, 0 | n/a | n/a | flag gate not read | Unit.cpp:9406-9408 |
| Ladder, knockback | one step then immune | same | mod 1.0, 0 | n/a | n/a | max level 2 | Unit.cpp:9424-9425; SpellInfo.cpp:3395 |
| Reset window | level back to full | level 0 if no aura active and more than 18 s since last one ended | 18 s | n/a | n/a | an active aura never resets | Unit.cpp:9357 |
| PvP cap | long CC on a player from a player is shortened | duration = min(base, limit) | default 8 s; examples 3 s (Binding Shot), 6 s (Wyvern Sting) | n/a | n/a | applied before the ladder | Unit.cpp:9386-9392; SpellInfo.cpp:3422-3428, 3454 |
| Bounce | a weaker new CC is refused | refuse if reduced new > 0 and < existing remaining | n/a | n/a | fails the cast (aura bounced) | per target at cast time | Unit.cpp:4926-4927; Spell.cpp:3802-3804 |
| Group type | which targets are diminished | ALL (stun, taunt) or PLAYER (rest) | n/a | n/a | n/a | Positive spells: NONE (group compute); LIMITONLY: cap without ladder | SpellInfo.cpp:2999-3000, 3379-3384 |

Which numbers suit a fast mobile fight (proposed, not measured): the ladder (100 / 50 / 25 / 0) is short enough to use in a 30 s duel. The 18 s reset is too long for that: a duel of about 30 s would never reset once a player is stunned twice. The 8 s PvP cap is a good starting limit for a stun in a fast duel; a 2-3 s cap may suit a duel better. All of these are data fields, see the JSON sidecar.

## 4. TypeScript sketch

simplified: keeps the donor's per-group keys, the read-before-count order, the PvP cap applied before the ladder multiply, the 18 s reset from the last aura's end, and the bounce check. It omits: the taunt flag (here the taunt ladder applies to every target; the donor applies it only to creatures with the obeys-taunt-DR flag, Unit.cpp 9400); the per-spell cap overrides (3 s, 6 s and others); the harmful-only test (the caller must pass harmful CC only, Spell.cpp 3214); the per-effect loop and the rule that immunity is a miss only when every effect is an aura (here a zero duration is always immune); the loop over all auras for the bounce (here one remaining value per call, the caller loops); and the game clock (time is passed in as milliseconds).

```ts
// Licence: GPL-2.0 (donor). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
type CcGroup = 'stun' | 'root' | 'incapacitate' | 'disorient' | 'silence' | 'knockback' | 'taunt';

interface DrRule {
  ladder: number[];      // duration multiplier by level; index 0 = first application at full length
  maxHits: number;       // landed hits that count before the level stops rising
  resetMs: number;       // level returns to 0 this long after the last aura of the group ended
  capMs: number | null;  // cap on a player-sourced CC applied to a player (null = no cap)
  appliesToAll: boolean; // false: diminished only when the target is a player
}

const RULE: Record<CcGroup, DrRule> = {
  stun:         { ladder: [1, 0.5, 0.25, 0], maxHits: 3, resetMs: 18000, capMs: 8000, appliesToAll: true },
  root:         { ladder: [1, 0.5, 0.25, 0], maxHits: 3, resetMs: 18000, capMs: 8000, appliesToAll: false },
  incapacitate: { ladder: [1, 0.5, 0.25, 0], maxHits: 3, resetMs: 18000, capMs: 8000, appliesToAll: false },
  disorient:    { ladder: [1, 0.5, 0.25, 0], maxHits: 3, resetMs: 18000, capMs: 8000, appliesToAll: false },
  silence:      { ladder: [1, 0.5, 0.25, 0], maxHits: 3, resetMs: 18000, capMs: 8000, appliesToAll: false },
  knockback:    { ladder: [1, 0], maxHits: 1, resetMs: 18000, capMs: 8000, appliesToAll: false },
  taunt:        { ladder: [1, 0.65, 0.4225, 0.274625, 0], maxHits: 4, resetMs: 18000, capMs: 8000, appliesToAll: true },
};

interface GroupState { hits: number; active: number; endedAtMs: number; }

export class DrTarget {
  private groups = new Map<CcGroup, GroupState>();

  constructor(readonly isPlayer: boolean) {}

  private state(g: CcGroup): GroupState {
    let s = this.groups.get(g);
    if (s === undefined) {
      s = { hits: 0, active: 0, endedAtMs: 0 };
      this.groups.set(g, s);
    }
    return s;
  }

  auraStarted(g: CcGroup): void {
    this.state(g).active += 1;
  }

  auraEnded(g: CcGroup, nowMs: number): void {
    const s = this.state(g);
    if (s.active > 0) {
      s.active -= 1;
      if (s.active === 0) s.endedAtMs = nowMs; // the reset clock starts when the last aura ends
    }
  }

  // Level the next landed hit will use. Read BEFORE that hit is counted.
  level(g: CcGroup, nowMs: number): number {
    const s = this.state(g);
    if (s.active === 0 && nowMs - s.endedAtMs > RULE[g].resetMs) return 0;
    return s.hits;
  }

  countHit(g: CcGroup, nowMs: number): void {
    const cur = this.level(g, nowMs);
    if (cur < RULE[g].maxHits) this.state(g).hits = cur + 1;
  }
}

export interface CcResult { durationMs: number; immune: boolean; level: number; }

// One harmful CC landing. baseMs is the ability's full duration.
export function landCc(t: DrTarget, g: CcGroup, baseMs: number, playerSource: boolean, nowMs: number): CcResult {
  const rule = RULE[g];
  const drOn = rule.appliesToAll || t.isPlayer;
  const level = drOn ? t.level(g, nowMs) : 0;
  if (drOn) t.countHit(g, nowMs);
  let d = baseMs;
  if (rule.capMs !== null && playerSource && t.isPlayer && d > rule.capMs) d = rule.capMs;
  if (drOn) d = Math.floor(d * rule.ladder[level]);
  return { durationMs: d, immune: d <= 0, level };
}

// A new CC is refused when its reduced duration would be shorter than one aura already on the target.
// The caller loops over the target's active auras of the same group, as the donor does.
export function bouncesOff(t: DrTarget, g: CcGroup, baseMs: number, remainingMs: number, nowMs: number): boolean {
  const rule = RULE[g];
  if (!(rule.appliesToAll || t.isPlayer)) return false;
  const d = Math.floor(baseMs * rule.ladder[t.level(g, nowMs)]);
  return d > 0 && d < remainingMs;
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS (`/tmp/mg004-TrinityCore-TrinityCore.ts`) exits 0.

## 5. Lands in

- TARGET `src/fight/status.ts` (new module: crowd-control state and the one ladder). The per-target state sits on the fighter record that the engine owns; the client only reads the result.
- Parity-checklist row 13 (specials). Crowd control from a special or a spell is the row-13 input; the server-verified duration is what the client shows.
- Data fields: ladder, max hits, reset window, PvP cap and group key are data (see the JSON sidecar).
- Reuse tag: rewrite-from-idea (GPL-2.0; clean-room only)
- Brief rule served: 1 (one engine: one place for CC state, server-verified); rules 7-9 n/a

## 6. Gaps and risks

- Frankendom rule (c): one ladder for all crowd control. The donor keeps seven groups, each with its own counter, so a stun and a fear never share a ladder. Our build must use one key.
- Enum alias (SharedDefines.h 7430-7431): `DIMINISHING_LEVEL_4` and `DIMINISHING_LEVEL_IMMUNE` are both 3. The taunt table uses 3 for the 0.274625 step, and the default table uses 3 for the zero step. This works only because the two tables never mix. Fix: write each ladder as an explicit array in data (as the sketch does), with no shared enum values.
- Wall-clock reset (Unit.cpp 9357, 9468): the donor reads the game clock in ms. Frankendom's server runs on a fixed tick. Fix: count the reset in server ticks, so a lag spike cannot shorten or lengthen the window.
- Reset rule: the window starts only when the group has no active aura. A chain of overlapping CCs never resets while one is still on. This is a design choice; test it in Frankendom before copying it.
- Default 8 s cap: it applies to every grouped spell (SpellInfo.cpp 3454), including knockback and taunt, unless the spell names its own limit. Fix: the cap is an explicit ability field, with no default in code.
- Targets: stun applies to NPCs as well as players (DRTYPE_ALL). Every other group applies to players only. For Frankendom's Pit (player against AI) this needs a Strategy ruling: a boss that cannot be stunned twice in a row is a different fight from one that can.
- Same-tick hits: in a many-on-one fight (MAX_ATTACKERS = 3), two CCs can land in the same tick. The donor's hit code runs once per target per spell, so two spells are handled one after the other (order inferred from the call structure, the scheduler was not read). Frankendom must pick one order (the server's input order) and test it, or the ladder steps differ between clients.
- Death wipes the state: `Unit::ClearDiminishings` runs on `JUST_DIED` (Unit.cpp 9206). Our fighter reset on death or round end must do the same.
- Spell-side behaviour is not covered: cast time, interrupts, resource pools and spell data were not read in this cell.

Reuse tag: rewrite-from-idea (GPL-2.0; clean-room only)
Brief rule served: 1 (one engine: one place for CC state, server-verified); rules 7-9 n/a

Best transferable idea: one diminishing-returns ladder (100 / 50 / 25 / immune) on the target, stepped per landed CC, reset after a quiet window, with a shorter CC refused against a stronger active one.

Decision (proposed): adapt - keep the ladder numbers, the read-before-count order, the cap-then-ladder order, and the bounce check; key them on one ladder for all CC (Frankendom rule c), tick-based reset, and an explicit per-ability cap. The 18 s window is long for a fast duel: keep it as data and tune it down (proposed, not measured).

Acceptance: a server test: a player hit by three harmful CCs from any mix of sources gets full, half and quarter length; the fourth is immune and the fight log says so; after the reset window with no CC active the next one is full length; a new stun that would be shorter than the one already on the target is refused.

## Checker findings (Sonnet 5.5 medium, 2026-10-12)

Verdict: MINOR
- Table row 'Group type' cited SpellInfo.cpp 3379, 3384 for 'Positive spells: NONE'; positive to `DIMINISHING_NONE` is at 2999-3000 (confirmed; 3379/3384 are the DRTYPE ALL/PLAYER cases).
- Missed (confirmed): bounce check sits inside `if (!skipCheck)` in `Spell::_cast`, so instant/skipCheck casts never bounce.
- Missed (confirmed): `Unit::ClearDiminishings` is called on `JUST_DIED` (Unit.cpp 9206).
- Missed (confirmed): `DIMINISHING_LIMITONLY` (SharedDefines.h 6658) gives cap with `DRTYPE_NONE`, no ladder.

Fixed 2026-10-12: group-type row and mechanism line cite 2999-3000 and add LIMITONLY; bounce line notes the skipCheck scope; death-clear added to Gaps. Sketch unchanged (it does not model these).
