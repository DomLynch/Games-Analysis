# LostCityRS-Engine-TS (progression, cell 10)

Donor: /mnt/frankendom-donors/LostCityRS-Engine-TS/src/engine/entity/Player.ts | Licence: MIT (LICENSE in the donor root, Lost City 2023-2026) | TypeScript | symbol getLevelByExp / getExpByLevel (table `levelExperience`)

Symbol check: `levelExperience` at 76, `getLevelByExp` at 86 and `getExpByLevel` at 96 confirmed. The table is built at module load from line 78.

## 1. Mechanism
- At module load, `levelExperience` (an `Int32Array(99)`, line 76) is filled by a loop (78-84): for i from 0 to 98, `level = i + 1`, `delta = floor(level + 2^(level/7) * 300)`, a running total `acc += delta`, and `levelExperience[i] = floor(acc / 4) * 10`. The stored XP is therefore in tenths: the comment at 1833 says stat XP is kept times 10 so a 32-bit integer holds a decimal point, with a cap of 2,000,000,000 ("200m").
- Index i holds the XP needed to reach level i + 2 (so level 2 is index 0).
- `getLevelByExp(exp)` (86-94) scans from index 98 down to 0 and returns `min(i + 2, 99)` for the first threshold with `exp >= levelExperience[i]`; returns 1 if none is met. It is a pure lookup.
- `getExpByLevel(level)` (96-98) returns `levelExperience[level - 2]` with no guard, so `getExpByLevel(1)` reads index -1, which is `undefined` on a typed array.
- Callers read: `Player.addXp` (1819-1893) multiplies the gain by `Environment.node.xpRate` when `allowMulti` (1830-1831), adds it to the stat, clamps to 2,000,000,000 (1834-1836), and recomputes `baseLevels[stat]` with `getLevelByExp` (1843), and `levels[stat]` too only when no buff or debuff is active (1839-1842). It throws on negative XP (1821-1823) and returns on zero (1826-1828). On a level-up it runs the change-stat script, logs, and queues the advance script (1845-1887). `Player.setLevel` (1902-1913) clamps the level to 1..99 and sets the XP to `getExpByLevel(level)` (1907). Also `PlayerLoading.ts` line 92 (`baseLevels[i] = getLevelByExp(stats[i])` on load) and line 47 (`getExpByLevel(10)` for starting hitpoints) and `ClientCheatHandler.ts` 483 (a cheat adds `getExpByLevel(n)`); those three call sites were grepped, not opened in full.
- Inputs: an XP integer or a level. Outputs: a level or an XP threshold. No tick: the table is built at load; levels are recomputed when XP is added or a player is loaded, and cached in `baseLevels`.

## 2. Key functions
- levelExperience (table build) | /mnt/frankendom-donors/LostCityRS-Engine-TS/src/engine/entity/Player.ts | 76-84 | builds the 99 thresholds at load.
- getLevelByExp | /mnt/frankendom-donors/LostCityRS-Engine-TS/src/engine/entity/Player.ts | 86-94 | reverse scan; capped at 99.
- getExpByLevel | /mnt/frankendom-donors/LostCityRS-Engine-TS/src/engine/entity/Player.ts | 96-98 | threshold lookup for a level.
- Player.addXp | /mnt/frankendom-donors/LostCityRS-Engine-TS/src/engine/entity/Player.ts | 1819-1893 | rate multiplier, 2e9 cap, level recompute, level-up side effects.
- Player.setLevel | /mnt/frankendom-donors/LostCityRS-Engine-TS/src/engine/entity/Player.ts | 1902-1913 | sets XP from a level via getExpByLevel.

## 3. Numbers vs mechanism
| Reusable algorithm | Game-specific constants |
|---|---|
| Exponential threshold table built by cumulative sum, then rounded | Growth term 2^(L/7) and base 300, the /4 and *10 rounding (theirs, lines 81-83); XP stored in tenths and capped at 2,000,000,000 (theirs, 1833-1836) |
| Reverse scan returns the highest level whose threshold is met | Level cap 99 (theirs, lines 76, 87, 89) |
| Index offset: index i is level i + 2 | Offset of 2 (theirs, a consequence of the table layout) |

## 4. TypeScript sketch
simplified: `Int32Array` is replaced by `number[]`; `addXp` (rate multiplier, 2e9 cap, buff handling, level-up side effects) and `setLevel` are omitted; `getExpByLevel` keeps the donor's missing guard, so level 1 returns `undefined` at runtime although the type says `number`.
```ts
// Licence: MIT (LostCityRS-Engine-TS). Lift permitted; re-expression of Player.ts 76-98.
const LEVEL_CAP = 99;
const levelExperience: number[] = new Array<number>(LEVEL_CAP).fill(0);

// Build thresholds once: cumulative sum of a growing step, then rounded.
{
  let acc = 0;
  for (let i = 0; i < LEVEL_CAP; i++) {
    const level = i + 1;
    const delta = Math.floor(level + Math.pow(2, level / 7) * 300);
    acc += delta;
    levelExperience[i] = Math.floor(acc / 4) * 10;
  }
}

// levelExperience[i] is the XP needed to reach level i + 2.
export function getLevelByExp(exp: number): number {
  for (let i = LEVEL_CAP - 1; i >= 0; i--) {
    if (exp >= levelExperience[i]) return Math.min(i + 2, LEVEL_CAP);
  }
  return 1;
}

export function getExpByLevel(level: number): number {
  return levelExperience[level - 2];
}
```

## 5. Lands in
- TARGET origins/progression/model.ts: it already is the career curve (`requirement(L)`, `cumulative(L)`, `levelOfCredit(credit, cap)`, integer only, `award(state, event)` as the one entry for credit). Nothing in this donor needs a new file: the donor's table lookup is an optimisation of what `levelOfCredit` already does by a loop over `cumulative`. Today the Pit side is src/career.ts (`levelOf(marks)`, moving behind the model).
- Parity-checklist row: 18 (loot roll and XP award; post-K item 3).
- Reuse tag: skip (already served by origins/progression/model.ts; the lookup is the only reusable idea and the loop there is enough for a 1..MAX_LEVEL ladder)
- Brief rule served: (category default, not per-cell) one-character, one-ledger rule; rules 7-9 n/a

## 6. Gaps and risks
- The curve is theirs (exponential, 99 levels). Frankendom's is its own (`REQ_BASE`, `REQ_STEP`, `REQ_KNEE`, `REQ_CURVE` in model.ts) and is pinned by the progression proposal; nothing here changes a number.
- One ledger, server-verified kills: the donor's `addXp` is a public method any script or the cheat handler can call, and level is cached in `baseLevels` beside the XP. In Frankendom credit moves only through `award(state, event)` called once per verified event, in the same transaction as loot (origins/server/mob-rewards.ts); the level is read from credit (`levelOfCredit`) and is never stored separately.
- No hidden numbers: the donor multiplies every gain by a server-wide `xpRate` (1830) and stores tenths in a capped int. Frankendom has no global XP rate; a rate would be a catalogue/type-weight field, and credit is plain integer CP that only goes up (no negative XP throw needed).
- The donor's `getExpByLevel(1)` is undefined (no guard) and level 99 vs the cap are tied by the array size; model.ts takes `cap` as a parameter, which is the safer shape.
- Level-difference pay (kill value falloff by target level minus yours, the type weight, the rested allowance) has no donor here; this file only covers the curve lookup.
