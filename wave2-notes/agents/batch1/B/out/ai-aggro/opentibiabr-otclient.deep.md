# opentibiabr-otclient (ai-aggro, cell 2)

Donor: `/mnt/frankendom-donors/opentibiabr-otclient/mods/game_bot/default_configs/vBot_4.8/targetbot/target.lua` | Licence: MIT (OTClient, Copyright 2010-2020 OTClient; LICENSE read, lines 1-5) | Lua | symbol `TargetBot.Creature.calculatePriority`

Checked: Opened and read in full the main selection macro `target.lua` 36-118 (the file's header 1-40 was also read), `creature.lua` 53-98 (config lookup and `calculateParams`), and `creature_priority.lua` 1-61 (the whole scorer). Also opened `creature_editor.lua` (grep for the four editor fields) and `vlib.lua` (grep for the area constants; their shapes were not read). Candidate files opened: `creature_priority.lua` (the hinted file), `target.lua`, `creature.lua`, `creature_editor.lua`, `vlib.lua`. Confidence high on the selection path and scorer. Not read: the `macro` helper body, the `findPath` signature (the argument `7` is passed through, its meaning is not read), `isInPz`, `TargetBot.Creature.attack`, the body of `getCreaturesInArea`, and the shapes of `diamondArrowArea` and `largeRuneArea`.

## 1. Mechanism

- One selection pass per tick. `target.lua` runs a macro with interval 100 (line 39). Each pass picks at most one target for the player.
- Candidate set: every spectator in a 12x12 box, radius 6 (line 41). If more than 10 of them are monsters, the set is narrowed to a 6x6 box, radius 3 (lines 48-49). So a crowd shrinks the window instead of adding more work.
- For each candidate (lines 57-62): skip if health is zero or less (line 59). Then `findPath` with a limit of 7 steps (line 60). Only monsters with a path count (line 61; the donor also gates on client version and creature type, not read in detail here).
- Scoring is per creature, not per attacker. `calculateParams` (creature.lua 74) tests every config whose name regex matches the creature (creature.lua 62). Each config is scored and the best one is kept with a strict `>` (creature.lua 81). The danger value comes from that winning config only (creature.lua 83).
- Score (`creature_priority.lua`, in this order):
  (a) start at 0; +1 if the creature is the current target (line 8);
  (b) out of reach: if the path is longer than the config's `maxDistance`, return now (line 12). The return is the current-target bonus only, so an out-of-reach current target keeps 1 and stays selectable; any other out-of-reach creature scores 0 (line 18);
  (c) add the config's `priority` (0-10 from the editor, line 22);
  (d) distance: +10 if adjacent (line 27), +5 if 2-3 steps (line 29);
  (e) paladin diamond arrows, config-gated: +4 per mob in `diamondArrowArea` (lines 34-35), and in rp-safe mode a return of 0 when a large rune area holds a creature (lines 38-42), with a side effect that cancels the attack (line 40). Omitted from the sketch;
  (f) low health: if chase is on and health is under 30, +5 (lines 48-49). Otherwise under 20 gives +2.5 (line 51), under 40 +1.5 (line 53), under 60 +0.5 (line 55), under 80 +0.2 (line 57). Note: with chase off, a creature at 25 percent gets +1.5 (the under-40 band), not +5.
- Selection (`target.lua`): each candidate's params are used for danger (line 63, summed for every monster with a path, even with a score of 0, though its danger is 0 unless its best config scored above 0). Only a score above 0 makes it a target (line 64). The highest score wins with a strict `>` (line 66), so the earlier creature in the list wins ties (line 68 stores the pick).
- After the scan: if there is a pick and the player is not in a protected zone (line 88), attack it (line 91). Otherwise fall through to looting or wait.

## 2. Key functions

- `TargetBot.Creature.calculatePriority` (the scorer, the hinted file): `/mnt/frankendom-donors/opentibiabr-otclient/mods/game_bot/default_configs/vBot_4.8/targetbot/creature_priority.lua` 1-61.
- `TargetBot.Creature.calculateParams` (best config per creature): `/mnt/frankendom-donors/opentibiabr-otclient/mods/game_bot/default_configs/vBot_4.8/targetbot/creature.lua` 74-93.
- `TargetBot.Creature.getConfigs` (regex match, cached): `/mnt/frankendom-donors/opentibiabr-otclient/mods/game_bot/default_configs/vBot_4.8/targetbot/creature.lua` 53-72.
- The main selection loop (macro body, the scan and the pick): `/mnt/frankendom-donors/opentibiabr-otclient/mods/game_bot/default_configs/vBot_4.8/targetbot/target.lua` 39-118.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Score each candidate by a sum of bands (base priority, distance, health), pick the strict maximum, treat 0 as "not a target" | Base priority 0-10 (editor, creature_editor.lua 79); distance bonus +10 adjacent, +5 at 2-3 steps (creature_priority.lua 27, 29) |
| Current target gets a small stickiness bonus | +1 (creature_priority.lua 8) |
| Finisher bonus for low health, switched on by a flag | Chase on and under 30: +5 (line 49). Otherwise (chase off, or chase on at 30 and above): under 20 +2.5 (line 51), under 40 +1.5 (line 53), under 60 +0.5 (line 55), under 80 +0.2 (line 57) |
| Out of reach: stop scoring early | Max distance default 10 (creature_editor.lua 81), chase default on (creature_editor.lua 92) |
| Crowd thinning: narrow the scan window when there are many candidates | Window radius 6, narrowed to radius 3 when more than 10 monsters (target.lua 41, 48-49) |
| Danger summed over all scanned candidates | The danger value is per config (creature.lua 83) |

## 4. TypeScript sketch

simplified: follows the donor's score order (current bonus, out-of-reach early return, base priority, distance, health) and the strict-maximum pick with the 0-means-no-target rule. It omits the paladin diamond-arrow bonus and its rp-safe return, the rp-safe cancel side effect, the client-version and creature-type gate, the protection-zone check, the attack call, and the per-config regex lookup (the sketch takes the rules as input). The path is passed in as a number (the donor calls `findPath` and only uses the path when it exists). The crowd count uses monsters in the 12x12 box, as the donor does.

```ts
// Licence: MIT (donor, OTClient). Clean-room sketch written from the described mechanism; not a translation of the donor lines.
export interface Foe {
  id: string;
  hpPct: number;     // 0-100
  pathLen: number;   // steps to reach it; caller passes only foes that have a path
  isMonster: boolean;
}

export interface Rule {
  priority: number;     // 0-10, set in the editor
  maxDistance: number;  // 1-10, set in the editor
  chase: boolean;
  danger: number;
}

export interface Pick { foe: Foe; rule: Rule; score: number }

// Score one foe under one rule. Out of reach: only the current-target bonus survives.
export function scoreFoe(foe: Foe, rule: Rule, isCurrent: boolean): number {
  let score = isCurrent ? 1 : 0;
  if (foe.pathLen > rule.maxDistance) return score;
  score += rule.priority;
  if (foe.pathLen === 1) score += 10;
  else if (foe.pathLen <= 3) score += 5;
  const hp = foe.hpPct;
  if (rule.chase && hp < 30) score += 5;
  else if (hp < 20) score += 2.5;
  else if (hp < 40) score += 1.5;
  else if (hp < 60) score += 0.5;
  else if (hp < 80) score += 0.2;
  return score;
}

// One tick. scan(r) returns the foes in a square of radius r around the player.
export function pickTarget(
  scan: (radius: number) => Foe[],
  rulesFor: (foe: Foe) => Rule[],
  currentId: string | null,
): { pick: Pick | null; danger: number } {
  let foes = scan(6);                                            // 12x12 window
  if (foes.filter(f => f.isMonster).length > 10) foes = scan(3); // crowded: 6x6 window
  let best: Pick | null = null;
  let danger = 0;
  for (const foe of foes) {
    if (!foe.isMonster || foe.hpPct <= 0) continue;
    let bestScore = 0;
    let bestRule: Rule | null = null;
    for (const rule of rulesFor(foe)) {
      const s = scoreFoe(foe, rule, foe.id === currentId);
      if (s > bestScore) { bestScore = s; bestRule = rule; }
    }
    danger += bestRule ? bestRule.danger : 0;   // danger only from a rule that scored above 0
    if (bestRule && bestScore > (best?.score ?? 0)) best = { foe, rule: bestRule, score: bestScore };
  }
  return { pick: best, danger };
}
```

## 5. Lands in

- TARGET `src/fight/aggro.ts` (new module: the engine's target choice for a fight step). Parity-checklist row 4 (fight loop: aggro, chase, leash). Today the donor's shape has no Frankendom counterpart; row 4 is marked "origins own copy", deleted by K2b / K2c.
- today: origins own copy (row 4). No `src/` file is named for this yet (not checked).
- Reuse tag: rewrite-from-idea (MIT, adaptation allowed; the sketch is clean-room)
- Brief rule served: 5 (many-on-one)
- Best transferable idea: pick one target per tick by a summed score (base priority, distance bands, a current-target stickiness bonus, a low-health finisher bonus), take the strict maximum, and thin the candidate window when a crowd forms.

## 6. Gaps and risks

- One engine: the scorer has a side effect (rp-safe calls `g_game.cancelAttackAndFollow`, creature_priority.lua 15 and 40). Frankendom's scorer must stay pure; the engine applies any state change (engage is a state change).
- Server-verified kills: the donor reads health and positions from the client's view and runs for one human player. Frankendom must score on server positions only, and the same pick must be reproducible on the server.
- MAX_ATTACKERS = 3: this donor picks one target for one player. For many-on-one, apply the cap before scoring, and let the pick feed the three attacker slots. The donor shows no monster choosing targets (not read).
- Leash: the donor's stickiness is a +1 that survives out of reach (creature_priority.lua 18). Frankendom needs an explicit leash in row 4 that drops a target, not a bonus that happens to keep it selectable.
- Tuning belongs in data: the bands (10, 5, 1, and the health thresholds) are this author's tuning. In Frankendom they go in the catalogue as AI knobs (row 21 lists AI knobs as a missing field), per creature, not as constants in the function.
- The `danger` total is a UI number here. Frankendom has no danger rating in the duel, so drop it unless the Pit needs it.
- Not read: `macro`, `findPath`, `isInPz`, `TargetBot.Creature.attack`, `getCreaturesInArea`, and the area shapes in `vlib.lua` (`diamondArrowArea` at 1169, `largeRuneArea` at 1083, grep only).
