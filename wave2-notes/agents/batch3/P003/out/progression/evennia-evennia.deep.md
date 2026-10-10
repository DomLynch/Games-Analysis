# evennia-evennia (progression, cell 10)

Donor: `/mnt/frankendom-donors/evennia-evennia/evennia/contrib/tutorials/evadventure/characters.py` | Licence: BSD-3-Clause (repo `LICENSE.txt`: "BSD 3-Clause License", Copyright 2012- Griatch and Gregory Taylor; code may be adapted) | Python | symbol `EvAdventureCharacter.add_xp` and `EvAdventureCharacter.level_up`

Checked: Opened `characters.py` 156-360 (class, XP attributes, `add_xp`, `level_up` read in full), `tests/test_quests.py` 55-75, `rules.py` 19-68 and 329, and `quests.py` and `shops.py` by grep only. Repo-wide grep for `add_xp` and `level_up` (excluding `characters.py`) found no caller; repo-wide grep for `max_hp` found no definition on this class. Confidence: high on the XP threshold and the level-up order of steps. The `max_hp` fault is read from the code, not run. Not read: the dice module beyond `rules.py`, and the Evennia base typeclass internals beyond a grep for `__getattr__`.

Best transferable idea: Gate a level-up on one cumulative XP total against level times a step, and spend a level as a separate call that adds at most three capped stat points and re-rolls max HP.

## 1. Mechanism

- XP and level are attributes on the character (`xp` default 0, `level` default 1, `xp_per_level` = 1000; lines 174, 177, 178). Two methods use them.
- `add_xp(xp)` (288-305) is a check, not a level change. Order of steps: (a) add the gain to the cumulative total (303); (b) compute the next threshold as `level * xp_per_level` (304); (c) return whether `xp >= threshold` (305). It returns a bool and leaves `level` alone.
- `level_up(*abilities)` (307-335) spends one level. Order of steps: (a) `level += 1` (320); (b) for each distinct name in the first three arguments (321), read the attribute with `getattr`, set it to `min(10, current + 1)` (325-329); a name that is not an attribute raises `AttributeError`, which is caught and skipped (331-332); (c) re-roll the max HP: `hp_max = max(self.max_hp + 1, roll("<new level>d8"))` (335).
- Numbers from the code (XP is cumulative, the threshold is a total, not a step): `add_xp` returns True at total XP >= 1000 to reach level 2, >= 2000 to reach level 3, >= 3000 to reach level 4. So the step from level 2 to level 3 is 1000 more XP, not 2000. The docstring (299-300) says "level 2 -> 3 = 2000 XP", which is the cumulative total.
- Level-up HP: the roll uses the new level (so reaching level 2 rolls `2d8`, 2 to 16). The intended floor is the old maximum plus 1 (line 335), but line 335 as written fails before that floor is applied (see the known fault below). Current `hp` is not changed by level-up (only `hp_max` is written on line 335).
- Ability picks: only the first three arguments count, duplicates count once (`set`, line 321), and each pick is capped at 10 (329). Unknown names are silently ignored (331-332).
- Known fault (read, not run): line 335 reads `self.max_hp`. The declared attribute is `hp_max` (173). A grep of the donor finds no `max_hp` property or attribute on this class. In typeclasses/ and utils/idmapper/ there is no `__getattr__` fallback. As written, `level_up` should raise `AttributeError` at line 335 after the level and ability changes have already been applied (not run).
- Caller behaviour: no caller of `add_xp` or `level_up` exists anywhere in the donor (repo-wide grep, excluding the definition file, found none). The one XP write outside these methods is a test fixture: `tests/test_quests.py` 66 does `self.quester.db.xp += 10`, which skips `add_xp` and so skips the threshold check.
- Tick: none. Progression is event-driven (a call per award), not a loop.

## 2. Key functions

- `add_xp`: `/mnt/frankendom-donors/evennia-evennia/evennia/contrib/tutorials/evadventure/characters.py` 288-305. Cumulative XP add and threshold check, returns bool.
- `level_up`: `/mnt/frankendom-donors/evennia-evennia/evennia/contrib/tutorials/evadventure/characters.py` 307-335. Level +1, up to three distinct ability +1 (cap 10), HP max re-roll (line 335 has the `max_hp` fault).
- Attribute declarations (the numbers): `/mnt/frankendom-donors/evennia-evennia/evennia/contrib/tutorials/evadventure/characters.py` 173-178 (`hp_max`, `level`, `xp`, `xp_per_level`).
- Dice used by the HP roll: `/mnt/frankendom-donors/evennia-evennia/evennia/contrib/tutorials/evadventure/rules.py` 26-67 (`EvAdventureRollEngine.roll`, returns the sum of `randint(1, diesize)` per die; the instance `dice` is at line 329). Read in full.
- Test-only XP write (not a progression path): `/mnt/frankendom-donors/evennia-evennia/evennia/contrib/tutorials/evadventure/tests/test_quests.py` 61-66.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Cumulative XP total, level-up when total >= level x step | Step 1000 (theirs, characters.py 178) |
| Level-up is a separate call; the award only reports "due" | None (mechanism, 288-305) |
| Spend one level: up to 3 distinct stat picks, +1 each | Pick count 3 (theirs, characters.py 321) |
| Stat cap | 10 (theirs, characters.py 329) |
| HP max re-roll with dice of the new level, never below old max + 1 | d8 per level (theirs, characters.py 335); floor old max + 1 (mechanism) |

## 4. TypeScript sketch

simplified: the donor has no award loop and no caller, so a large award would skip levels if a caller called `add_xp` once and `level_up` once. The sketch adds `awardXp`, which loops until the total is below the next threshold. It also replaces the donor's `max_hp` name with a single `hpMax` field, which is the donor's intent (line 335), and makes the level-up HP roll take an injected dice function so a server can own the RNG. It omits the `AttributeError`-skipping for unknown ability names (the sketch takes typed keys), the `getattr` on the object, the docstring's cap wording, and the `hp` (current HP) handling, which the donor also omits.

```ts
// Licence: BSD-3-Clause (donor, evennia LICENSE.txt). Fresh sketch from the described mechanism.
type AbilityKey = "str" | "dex" | "con" | "int" | "wis" | "cha";

interface Hero {
  level: number;
  xp: number;            // cumulative XP, never reset on level-up
  hpMax: number;
  abilities: Record<AbilityKey, number>;
}

const XP_PER_LEVEL = 1000;  // zone data in Frankendom, not a constant
const ABILITY_CAP = 10;

// Adds XP and reports whether the hero has reached the next level threshold.
// Threshold is cumulative: level L needs xp >= L * XP_PER_LEVEL.
function addXp(h: Hero, gained: number): boolean {
  h.xp += gained;
  return h.xp >= h.level * XP_PER_LEVEL;
}

// Spends one level: level +1, up to three distinct abilities +1 each (cap 10), HP max re-rolled.
function levelUp(h: Hero, picks: AbilityKey[], roll: (dice: number, sides: number) => number): void {
  h.level += 1;
  for (const a of new Set(picks.slice(0, 3))) {
    h.abilities[a] = Math.min(ABILITY_CAP, h.abilities[a] + 1);
  }
  const rolled = roll(h.level, 8);             // NdM with N = new level, d8
  h.hpMax = Math.max(h.hpMax + 1, rolled);     // always at least +1 over the old max
}

// Drains a whole XP gain: the donor's addXp reports one level at most per call, so the caller loops.
function awardXp(h: Hero, gained: number, pickFor: (h: Hero) => AbilityKey[], roll: (d: number, s: number) => number): number {
  let levels = 0;
  if (!addXp(h, gained)) return 0;
  while (h.xp >= h.level * XP_PER_LEVEL) {
    levelUp(h, pickFor(h), roll);
    levels += 1;
  }
  return levels;
}
export {};
```

## 5. Lands in

- TARGET `src/fight/xp.ts` (new, proposed; not checked against the Frankendom repo): the award and level step behind row 18, called only from the server after a verified kill. The XP award is a single ledger write.
- Parity row: 18 (loot roll and XP award). The award is a server write, so the award and level-up are logged there, not on the client.
- Reuse tag: adapt-allowed (BSD-3-Clause; the sketch is a fresh write from the mechanism)
- Brief rule served: 1 (one engine, server-verified awards, one ledger); progression numbers are zone or class data, not code constants

## 6. Gaps and risks

- The donor has no server and no caller of its own. `add_xp` is a plain method any code can call, so it proves nothing about who awarded the XP. Frankendom must make the award a server write after a verified kill, and must not let a client call it.
- The donor's `level_up` as written reads an undefined name (`max_hp`, line 335). Do not port it. The sketch uses `hpMax`. Frankendom needs a test that calls `levelUp` once and checks the HP max.
- Threshold semantics: the donor's threshold is a cumulative total, and its docstring (299-300) calls the step "2000 XP" for level 2 to 3. Pick one meaning (total or step) in the zone or class data and test it. The sketch uses a total.
- Large awards: `add_xp` reports one level per call and does not loop. A caller that calls once per award will skip levels. The sketch loops; the donor does not.
- Unknown ability names are silently skipped (331-332). Frankendom's server must reject unknown picks and must cap picks at 3 and each ability at 10.
- The HP roll uses the donor's `rules.dice` (`random.randint`, rules.py 67). Frankendom needs the roll on the server's seeded RNG and written to the fight record (row 19) so a level-up can be replayed.
- The dice check at rules.py 61 (`if 0 < number > max_number:`) is a chained comparison. It does not reject zero or negative counts (read from the expression, not run). Not needed for the level roll (level is at least 1), but do not copy it.
- Quest XP in the donor is a test fixture (test_quests.py 66) that bypasses `add_xp`. Frankendom must route every XP source through the one award function so the threshold check always runs.
