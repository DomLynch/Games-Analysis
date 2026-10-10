# alexbatalov-fallout2-ce (ai-aggro, cell 2)

Donor: `/mnt/frankendom-donors/alexbatalov-fallout2-ce/src/combat_ai.cc` | Licence: Sustainable Use License 1.0 (LICENSE.md line 1; own-use and non-commercial limits; restricted, not OSI) | C++ | symbol `_ai_danger_source`

Checked: Symbol `_ai_danger_source` at combat_ai.cc 1529 (read 1529-1708, whole function). Also read: `aiFindAttackers` (1457 on), the comparators (1290-1390), `_ai_find_nearest_team` (1397-1424), `_combat_ai` (3053 on), `_combatai_rating` and `_combatai_check_retaliation` (3449-3495), `isWithinPerception` (3499 on), `_critter_set_who_hit_me` (critter.cc 1285-1300), and the combat.cc call sites at 3302, 3558 and 4700-4750. Callers of `_ai_danger_source`: combat_ai.cc 3088 (read), 3203 and 3227 (grep only, bodies not read). Callers of `_combat_ai`: one in src, combat.cc 3302 (enclosing function not read). Not read: `_can_see`, the bodies of `pathfinderFindPath` and `_combat_check_bad_shot` (0 from the path call is read as "no path", from its use at 1609), the body of `_ai_try_attack` past its first line, `_ai_run_away`, `_ai_find_friend`, `_cai_perform_distance_prefs`, the packet loader (min_hp, hurt_too_much, max_dist), the disposition values, and the tie order of qsort. Confidence: high on order of steps and on the numbers; medium on what the sort names mean (see Gaps). Depth full for the target path.

Best transferable idea: Keep attacking the unit that last hit you (or that you last attacked) while it lives, and fall back to the nearest seen, reachable enemy only when it is gone.
Decision (proposed): adapt — the order (hold the last hitter, then the three "who is fighting me" categories, then seen and reachable) is the one-engine many-on-one target rule Frankendom needs for MAX_ATTACKERS = 3; adapt, not adopt, because the donor's cap of 3 is its category count rather than an attacker limit, its sort names disagree with its sort direction, and its ranges must become data.
Acceptance: Server test: with hero A hitting an NPC, the NPC's target stays A on every tick while A is alive and in perception; after A dies it targets the nearest living unit on A's side (fixed seed, tick log asserted).

## 1. Mechanism

- Target choice for one NPC is `_ai_danger_source` (1529). `_combat_ai` calls it only when the caller passed no defender: `if (a2 == nullptr) { a2 = _ai_danger_source(a1); }` (3087-3088). The one caller of `_combat_ai` (combat.cc 3302) passes `_gcsd->defender`, or nullptr when there is no `_gcsd`; a non-null defender skips the search.
- Party members (1541 on) use an attack-who policy with a sticky last target. Non-party NPCs get `attackWho = -1` (1648, the else branch of the party check) and take the generic path.
- Generic path, in order:
  1. Hitter hold (1651-1657). If `whoHitMe` is set, is not the NPC itself, and is alive, it is returned at once. No perception, path or shot check. A living hitter is kept at any distance.
  2. Dead hitter (1661). If `whoHitMe` is dead and on another team, slot 0 is the nearest living unit on the dead hitter's team (`_ai_find_nearest_team(a1, whoHitMe, 1)`, flags 1 = same team as the given unit, 1417 and 1661).
  3. Three categories (`aiFindAttackers`, 1457). Candidates are sorted by distance from the NPC (1476). The loop stops at 3 found (1483). Slot 1: a living unit whose `whoHitMe` is this NPC (1488; no team check). Slot 2: a unit on this NPC's team whose living hitter is on another team and is not this NPC. Slot 3: a living unit on another team whose hitter is on this NPC's team. One candidate fills at most one slot (`continue`).
  4. Fleeing filter, party only (1670). Then sort. STRONGEST uses the strength comparator (1681). Default (CLOSEST, and -1 for non-party) sorts by distance (1689). WEAKEST uses the weakness comparator. All four slots are sorted together, so slot 0 keeps no priority.
  5. Final loop (1693-1700). The first slot that passes `isWithinPerception` and (path result != 0 OR primary shot == COMBAT_BAD_SHOT_OK) is returned. A slot that fails prints "couldn't get at my target" and the loop moves on. If none passes, the result is nullptr.
- What writes `whoHitMe`, which makes steps 1-3 work:
  - `_ai_try_attack` sets the attacker's own `whoHitMe` to the chosen defender (combat_ai.cc 2694). So the hold keeps the NPC on the unit it last attacked, while that unit lives.
  - Being hit: `_critter_set_who_hit_me` (critter.cc 1285-1300) sets the field unless the two units share a team and an intelligence roll is 2 or more (or both are party members). A nullptr argument clears it.
  - Retaliation: when a defender that is not dead or knocked out, on another team (or the `oops` case), or an extra is hit, `_combatai_check_retaliation` (combat_ai.cc 3484; called from combat.cc 4714-4717 and 4745) switches the hitter to the attacker only if the attacker's rating is higher than the current hitter's rating (3490). With no current hitter, it just sets it.
  - Rating `_combatai_rating` (3449-3480): 0 for non-critters and for dead or knocked-out units. Otherwise melee damage, raised to the larger held-weapon max damage, plus armour class.
- Driver `_combat_ai` (3053), per NPC turn:
  - (a) Flee gate first (3076-3079): fleeing maneuver, or `results & ai->hurt_too_much`, or HP below `ai->min_hp`, runs `_ai_run_away` and returns. No target is picked that turn.
  - (b) Drugs check (3083-3085) runs away.
  - (c) Otherwise pick a target if none was given (3088), call distance preferences, and `_ai_try_attack` if a target exists.
  - (d) Leash (3098-3101): if a target exists, is alive, AP is not 0, and distance is greater than `ai->max_dist`, move away from a friendly corpse, or if `_ai_find_friend` fails, set `CRITTER_MANEUVER_DISENGAGING` (3109).
  - (e) With no target and no given defender: a unit moves back toward its nearest teammate (team not 0: `_ai_find_nearest_team_in_combat`, 3141) or toward the player (team 0, 3143) when further than 5 (3139). Party members on team 0 use a table by distance preference instead.
- Flee threshold: `ai->min_hp = maximumHp - maximumHp * _hp_run_away_value[runAwayMode] / 100` (833), table `{0, 25, 40, 60, 75, 100}` (253). Mode COWARD (value 25) gives min_hp = 75 percent of max HP. The setter refuses modes of 6 and above (825).
- Perception (`isWithinPerception`, 3499 on): if the target is visible (`_can_see`, not read), range is 5 x perception (3509). Otherwise range is perception out of combat (3534) or 2 x perception in combat (3531-3532). The player gets sneak divisors, not covered here. Distance units come from `objectGetDistanceBetween` (not read).

## 2. Key functions

- `_ai_danger_source`: `/mnt/frankendom-donors/alexbatalov-fallout2-ce/src/combat_ai.cc` 1529-1708. Hold, dead-hitter slot, categories, sort, perception and reach-or-shot loop.
- `aiFindAttackers`: `/mnt/frankendom-donors/alexbatalov-fallout2-ce/src/combat_ai.cc` 1457 on. Three categories, cap at 3 found, one slot each.
- `_combat_ai`: `/mnt/frankendom-donors/alexbatalov-fallout2-ce/src/combat_ai.cc` 3053 on. Flee gate, target pick, attack, leash, teammate pull.
- `_combatai_check_retaliation` and `_combatai_rating`: `/mnt/frankendom-donors/alexbatalov-fallout2-ce/src/combat_ai.cc` 3449-3495. Switch hitter only to a higher-rated attacker.
- `isWithinPerception`: `/mnt/frankendom-donors/alexbatalov-fallout2-ce/src/combat_ai.cc` 3499 on. Seen 5x, unseen 1x or 2x perception.
- `_critter_set_who_hit_me`: `/mnt/frankendom-donors/alexbatalov-fallout2-ce/src/critter.cc` 1285-1300. Writes the hitter field.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Keep the last unit that hit you or that you attacked, while it lives (no range check) | None (a rule). The attacker's field is written in `_ai_try_attack` (combat_ai.cc 2694) |
| Dead hitter: nearest living unit on its side goes first | None (the slot is then sorted with the rest) |
| Three "fighting me" categories, one slot each, stop at 3 found | Cap 3 = number of categories (combat_ai.cc 1483) |
| Sort candidates by distance, take the first that is seen and reachable or shootable | Seen range 5 x perception (3509); unseen 1 x perception out of combat (3534), 2 x in combat (3532) |
| Retaliate only to a strictly higher-rated attacker | Rating = melee damage (or larger weapon max damage) + armour class (3480) |
| Flee when HP is below min_hp; min_hp = max - max x v / 100 | v table `0, 25, 40, 60, 75, 100` (253); setter (833) |
| Teammate pull-back distance | 5 for non-party (3139) |

## 4. TypeScript sketch

simplified: keeps the donor order: hold a living hitter with no range check; a dead hitter's side in slot 0; three categories with the 3-found cap; all four slots sorted together by distance; first slot that is seen and (reachable or shootable). It omits the party-member branch (sticky last target, attack-who policies, disposition filter for fleeing units), the strength and weakness sorts, the side effect that clears `whoHitMe` for non-WHOMEVER policies, the debug line, the qsort tie order, the flee gate, the leash, and the perception numbers (passed in through `inPerception`). It does not add any order the donor does not have.

```ts
// Licence: Sustainable Use License 1.0 (donor, restricted). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
interface Unit {
  id: number;
  team: number;
  alive: boolean;
  hitter: Unit | null; // the unit that last hit this one, or that it last hit
}

interface TargetWorld {
  units: Unit[];
  dist(a: Unit, b: Unit): number;
  inPerception(self: Unit, other: Unit): boolean; // seen, or near enough to hear (donor: isWithinPerception)
  canReach(self: Unit, other: Unit): boolean;     // a path exists
  shotOk(self: Unit, other: Unit): boolean;       // weapon in range with ammo
}

// Target pick for one NPC, in the donor's order:
// 1. a living hitter is kept with no range check;
// 2. else the nearest living unit on a dead hitter's side goes into slot 0;
// 3. three categories fill slots 1-3 (who hits me / who hits my side / my side's hitter is on the other team), stop at 3 found;
// 4. all four slots are sorted together by distance;
// 5. the first slot that is seen and (reachable or shootable) wins.
function pickTarget(self: Unit, w: TargetWorld): Unit | null {
  const hitter = self.hitter;
  if (hitter !== null && hitter !== self && hitter.alive) {
    return hitter;
  }

  const slots: (Unit | null)[] = [null, null, null, null];
  const byDist = (a: Unit, b: Unit): number => w.dist(a, self) - w.dist(b, self);

  if (hitter !== null && hitter !== self && !hitter.alive && hitter.team !== self.team) {
    const side = w.units.filter((u) => u !== self && u.alive && u.team === hitter.team).sort(byDist);
    slots[0] = side.length > 0 ? side[0] : null;
  }

  let found = 0;
  const others = w.units.filter((u) => u !== self).sort(byDist);
  for (const c of others) {
    if (found >= 3) break;
    if (slots[1] === null && c.alive && c.hitter === self) {
      slots[1] = c;
      found++;
      continue;
    }
    if (slots[2] === null && c.team === self.team && c.hitter !== null && c.hitter !== self && c.hitter.team !== self.team && c.hitter.alive) {
      slots[2] = c.hitter;
      found++;
      continue;
    }
    if (slots[3] === null && c.alive && c.team !== self.team && c.hitter !== null && c.hitter.team === self.team) {
      slots[3] = c;
      found++;
      continue;
    }
  }

  const sorted = [...slots].sort((a, b) => {
    if (a === null && b === null) return 0;
    if (a === null) return 1;
    if (b === null) return -1;
    return byDist(a, b);
  });

  for (const c of sorted) {
    if (c !== null && w.inPerception(self, c) && (w.canReach(self, c) || w.shotOk(self, c))) {
      return c;
    }
  }
  return null;
}

export {};
```

## 5. Lands in

- TARGET `src/fight/ai.ts` (the AI brain's target pick, inside the engine; not the client). Parity-checklist row 2 (AI brain).
- Reuse tag: rewrite-from-idea (Sustainable Use License 1.0, restricted: clean-room, shape only)
- Brief rule served: one engine (target choice lives in the engine, not in the client); MAX_ATTACKERS = 3 (see Gaps for what the donor's 3 means)

## 6. Gaps and risks

- Licence is restricted (Sustainable Use License 1.0, own-use and non-commercial limits). Clean-room only; nothing is copied.
- `whoHitMe` is overloaded. It is written as "last hitter" (critter.cc 1297), as "current target" (combat_ai.cc 2694), and by the retaliation rule. The hold only works because of the second write. Frankendom needs two named fields (last hit by, current target) in one ledger, and a test for each.
- The hold has no range check. A living hitter or target is kept out of sight until it dies, a higher-rated attacker replaces it, or the field is cleared elsewhere. The leash only sets DISENGAGING (combat_ai.cc 3109, gated by the packet's max_dist); what DISENGAGING does was not read. The leash must be explicit in src/fight/ai.ts and tested, not left to the hold.
- MAX_ATTACKERS = 3: the donor's cap of 3 is the number of categories (1483), not a limit on how many enemies attack an NPC. The engine must cap attackers separately from this loop.
- Sort names and direction disagree as written. `_compare_strength` sorts ascending by rating (1343-1344), so ATTACK_WHO_STRONGEST picks the lowest rating first; `_compare_weakness` sorts descending (1379-1380). I did not run this. Do not copy the names.
- Category 1 has no team check (1488), so an ally whose hitter is this NPC can be picked (friendly-fire case). Frankendom's one side model needs a test for it.
- Slot 0 loses priority after the shared sort (1689). If "the dead hitter's side first" matters in Frankendom, slot 0 must not be sorted with the others.
- Flee table names do not match the thresholds. Value 0 (NONE) makes min_hp equal max HP, so the HP check fires on any damage; value 100 (TOURNIQUET) makes min_hp 0. The enum has 7 entries and the table has 6; the setter refuses 6 and above. Read as written. Frankendom's flee thresholds should be data fields with plain names.
- Not read: `_can_see`, the bodies of the path and shot checks, the rest of `_ai_try_attack`, the packet loader (min_hp, hurt_too_much, max_dist), the disposition values, and qsort tie order (equal distances take whatever order qsort gives).
- Perception ranges are in the donor's tile distance units (objectGetDistanceBetween not read). Make them data fields with stated units.
