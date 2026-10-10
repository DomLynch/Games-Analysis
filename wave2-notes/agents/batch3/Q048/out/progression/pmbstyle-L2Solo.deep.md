# pmbstyle-L2Solo (progression, cell 10)

Donor: `/mnt/frankendom-donors/pmbstyle-L2Solo/src/GameServer/Progression/DeathExperience.js` | Licence: Apache License 2.0 (LICENSE file, "Version 2.0, January 2004"; README line 290 "L2Solo is licensed under the Apache 2.0 license.") | JavaScript (Node) | symbol `calculateLoss` (with `applyDeathPenalty`, `restoreFromResurrection`)

Checked: Read in full: `Progression/DeathExperience.js` (268 lines), `Progression/ProgressionCap.js` (111 lines), and `ClassProgression.js` (103 lines; the hint file). The hint file is the wrong one: it is a class tree and a third-class CP table, with no XP rule; the death-XP rule is in `DeathExperience.js`, found by grep on `applyDeathPenalty` and `deathExperience`. Callers read: `Actor/Generics/Die.js` 20-60 (what the death passes in) and `Actor/Generics/Revive.js` 38-70 (restore or clear). Grep only: `Bot/Population/BotLifeState.js` 2311-2322 (cold-state variant of the same rule), `Formulas.js` CP table. Not read: the experience table values (`DataCache.js` loads them from `Templates/Experience/experience`), the database functions called by the penalty and restore (`Database.applyCharacterDeathExperience`, `restoreCharacterDeathExperience`), `ProgressionRates.js`. Confidence high on the penalty and the restore order; medium on the unloaded-character restore path, because its database code was not read. Torn between STRONG and PARTIAL: STRONG, because the rule is self-contained and checkable. camera_scope: n/a.

Best transferable idea: on a verified death take a level-scaled share of the current level's XP interval into a pending record, let a revive win back a set share of it capped at the pre-death total, and never penalise a second death before the revive.
Decision (proposed): adapt - keep the pending record, the one-penalty-per-death guard and the capped restore; the loss curve and the exemptions become catalogue/zone data, and only a server-verified death writes the record (the Pit is a client and writes no XP).
Acceptance: a server test asserts that a verified death in a zone takes the level-scaled share once, a second death before revival takes nothing more, and a revive returns the configured share but never more than the pre-death XP.

## 1. Mechanism

- Trigger: `Die.js` calls `applyDeathPenalty` (line 29) only for player characters: the actor must have `fetchExp`, `setExpSp` and no `fetchKind` (27). It passes flags: arena (30-32), killerPlayable (33: a killer that is not self and not an NPC), clanWar, festival, event, pvpZone, siegeZone, siegeParticipant, killerSiegeNpc (34-40). This happens before `actor.destructor()` (45).
- Order inside `applyDeathPenalty` (108-141):
  (a) If a record is already pending, return it as a duplicate (109-111). A second death before revival is not penalised again.
  (b) `calculateLoss` (112-119; body 37-57): the level is read; an exempt reason returns no loss (noPenaltyReason, 19-27). Otherwise `percent = max(0, 6.5 - 0.07 x level)` (43); divided by 4 for clan war or festival (44); `lost = round(levelInterval(level) x percent / 100)` (45); `after = max(0, before - lost)` (46).
  (c) If nothing is lost the record is cleared (116-118). Otherwise the record holds expBeforeDeath, expLost, expAfterDeath and pendingRestoration: true (121-130).
  (d) The level after death is `levelForExperience(expAfterDeath)` (120), the actor's exp and level are set and stats recalculated (132, synchronizeActor 93-101), and the record is written through a per-character write queue (133-140).
- Exemptions (noPenaltyReason, 19-27), in this order: explicit `noPenalty`; arena, event or duel; lucky protection (skill 194, only at level 4 or below, 13-17, 22); a pvp zone with a playable killer and no siege zone (23); a siege participant killed by a playable or siege NPC killer (24-25).
- Level interval (`levelInterval`, 29-35): for levels below the max it is `table[level] - table[level-1]`; at or above the max it is the last interval. The table is cumulative XP per level (`ProgressionCap.levelForExperience` reads `experience[level - 1]` as the threshold for a level, 87).
- Restore (`restoreFromResurrection` 144-168 and `calculateRestoration` 59-75): on revive with a percent, `restoredExp = min(expLost, round(expLost x percent / 100))` (66); `totalExp = min(expBeforeDeath, currentExp + restoredExp)` (67); the level is re-derived (73) and the record is marked not pending (149-150). Revive with no percent clears the record instead (`Revive.js` 47).
- Cold variant (`applyColdDeath` 183-205, `restoreCold` 207-222): the same rule on a plain state object, used by cold (offline) bots (`BotLifeState.js` 2311-2322, grep only).
- Level cap and clamp (`ProgressionCap.js`): `maximumAllowedExperience` = `experience[cap] - 1`, one below the threshold of the level after the cap (62); `clampTotalExperience` clamps to it (66); `applyAward` reports `accepted` and `discarded` (69-80).

## 2. Key functions

- `calculateLoss` and `levelInterval`: `/mnt/frankendom-donors/pmbstyle-L2Solo/src/GameServer/Progression/DeathExperience.js` 29-57.
- `noPenaltyReason`: same file, 19-27.
- `applyDeathPenalty`: same file 108-141 (duplicate guard 109-111; record 121-130).
- `calculateRestoration` and `restoreFromResurrection`: same file 59-75 and 144-168.
- `applyColdDeath` and `restoreCold`: same file 183-222.
- Caller: `/mnt/frankendom-donors/pmbstyle-L2Solo/src/GameServer/Actor/Generics/Die.js` 20-42. Caller: `/mnt/frankendom-donors/pmbstyle-L2Solo/src/GameServer/Actor/Generics/Revive.js` 38-48.
- Level from exp: `/mnt/frankendom-donors/pmbstyle-L2Solo/src/GameServer/Progression/ProgressionCap.js` 82-90, cap 62-67.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Loss = interval of the current level x a percent that falls with level | Base 6.5 and slope 0.07 per level (theirs, DeathExperience.js 43); floor 0 |
| Shared loss divided for group or event situations | Divisor 4 for clan war or festival (theirs, 44) |
| Exempt situations lose nothing, checked in a fixed order | Lucky skill 194 and level 4 limit (theirs, 5 and 14); pvp and siege rules (23-25) |
| Pending record blocks a second penalty until revive | None (the guard, 109) |
| Restore a share of the lost XP, capped at the pre-death total | Percent comes from the caller (clamped 0-100, DeathExperience.js 63); the donor values were not read |
| Level from exp by scanning down from the cap | Cap 78 (theirs, ProgressionCap.js 3) |

Arithmetic on the donor's formula (not a donor value): a level-1 death loses 6.43% of the level-1 interval; at level 20, 5.10%; at level 40, 3.70%; at level 78, 1.04%. Clan war or festival divides each by 4 (level 40: 0.93%).

## 4. TypeScript sketch

simplified: keeps the donor order (duplicate guard, exemptions, interval times percent, the level from the reduced exp, the pending record, then restore capped at the pre-death total). It omits the exemption reasons (a single `exempt` flag), the clan war and festival flags (a single `reduced` flag), the level clamp and `applyAward`, the write queue and database calls, the cold-state variant, the synchronise and stats step, and `levelForExperience`'s fallback (the sketch returns 1). The typecheck passed on the VPS (`tsc --strict`, es2020); the file was removed from the VPS /tmp afterwards.

```ts
// clean-room: shape of the rule only, written from the described mechanism, not a translation.
interface DeathRecord { expBeforeDeath: number; expLost: number; pending: boolean; }
interface Character { exp: number; level: number; death: DeathRecord | null; }

// table[i] = cumulative XP at which level i + 1 is reached.
function levelInterval(level: number, table: number[], maxLevel: number): number {
  if (level >= maxLevel) return Math.max(0, table[maxLevel - 1] - table[maxLevel - 2]);
  return Math.max(0, table[level] - table[level - 1]);
}

// Loss share falls as the level rises (6.5 - 0.07 * level, in percent); it is divided by 4 in clan war or festival.
function lossPercent(level: number, reduced: boolean): number {
  const p = Math.max(0, 6.5 - 0.07 * level);
  return reduced ? p / 4 : p;
}

// Exempt cases (arena, event, lucky, pvp zone with a player killer, siege) lose nothing.
function levelFor(exp: number, table: number[], cap: number): number {
  for (let level = cap; level >= 1; level--) if (exp >= table[level - 1]) return level;
  return 1;
}

function onDeath(c: Character, table: number[], maxLevel: number, cap: number,
                 exempt: boolean, reduced: boolean): Character {
  if (c.death?.pending) return c; // a second death before revival does not penalise again
  if (exempt) return { ...c, death: null };
  const lost = Math.round(levelInterval(c.level, table, maxLevel) * lossPercent(c.level, reduced) / 100);
  const after = Math.max(0, c.exp - lost);
  const expLost = c.exp - after;
  if (expLost <= 0) return { ...c, death: null };
  return {
    ...c,
    exp: after,
    level: levelFor(after, table, cap),
    death: { expBeforeDeath: c.exp, expLost, pending: true },
  };
}

// On resurrection a share of the lost XP comes back, never more than the pre-death total.
function onResurrect(c: Character, restorePercent: number, table: number[], cap: number): Character {
  if (!c.death?.pending) return c;
  const p = Math.max(0, Math.min(100, restorePercent));
  const back = Math.min(c.death.expLost, Math.round(c.death.expLost * p / 100));
  const total = Math.min(c.death.expBeforeDeath, c.exp + back);
  return { ...c, exp: total, level: levelFor(total, table, cap), death: { ...c.death, pending: false } };
}

export {};
```

## 5. Lands in

- TARGET `src/fight/death-xp.ts` (new): the engine step that runs once per server-verified death of a player character and once per revive. Parity-checklist row 17 (death/respawn). The XP award (row 18) is unchanged.
- Reuse tag: rewrite-from-idea (Apache 2.0: code may be adapted, but the sketch is written from the mechanism)
- Brief rule served: 1 (one engine; the penalty is one server write); zones as data for the loss curve; rules 7-9 n/a

## 6. Gaps and risks

- Licence: Apache 2.0 allows adaptation, so the sketch is clean-room by choice; the donor's own code is not copied.
- Server-verified kills: the donor's `Die.js` decides the flags (pvp, siege, killer type) from the caller's context. Frankendom's kills are server-verified, so the flags must come from the engine record, not the client.
- One ledger: the donor writes the penalty to a character row and to the actor, through a per-character write queue. Frankendom must keep one ledger: the pending record lives with the character, not in a separate store.
- Pit as client: a Pit death must not write XP. The donor has no equivalent of the Pit, so its arena and event exemptions are the nearest match; a Pit death should be exempt by rule, not by a flag the client sends.
- Zones as data: the loss curve (6.5, 0.07), the divisor 4 and the restore percent are donor numbers. In Frankendom they belong in zone or catalogue data, and the sidecar marks them as engine constants only where they are fixed rules.
- Unloaded characters: the donor's restore for an unloaded character goes to the database (`restoreCharacterDeathExperience`, not read). Frankendom needs its own answer for a player who logs out with a pending record.
- The level interval comes from a table the donor loads at startup (`DataCache.js` 20); its values were not read, so the example percentages above are arithmetic, not donor numbers.

Reuse tag: rewrite-from-idea (Apache 2.0; adaptable, sketch written clean-room)
Brief rule served: 1 (one engine; one server write per death); zones as data for the loss curve; rules 7-9 n/a
