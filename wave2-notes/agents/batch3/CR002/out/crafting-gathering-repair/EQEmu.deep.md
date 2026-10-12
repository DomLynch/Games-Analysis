# EQEmu (crafting-gathering-repair, cell 30)

Donor: `/mnt/frankendom-donors/EQEmu/` (C++: `zone/forage.cpp`, `zone/object.cpp`, `zone/zone.cpp`, `zone/tradeskills.cpp`, `common/random.h`, `common/ruletypes.h`) | Licence: GPL-3.0 (LICENSE.md, "Version 3, 29 June 2007"; file headers say "version 3 of the License, or (at your option) any later version") | C++ | symbols `LoadForage`, `ForageItem`, `GoFish`, `Object::HandleClick`, `Object::RandomSpawn`, `LoadGroundSpawns`, `TradeskillExecute`, `CheckIncreaseTradeskill`

Checked: Read in full: `zone/forage.cpp` (1-556: forage table, fishing, forage action, fishing action, skill-ups). Read: `zone/object.cpp` 100-125, 525-600, 680-725, 878-935 (ground node constructor, respawn check, random placement, click, DB loader); `zone/zone.cpp` 342-360 (node spawning loop); `zone/tradeskills.cpp` 985-1135 and 1135-1276 (chance, success, failure and salvage, skill-up), 1512-1520, 1614-1622, 1645-1656 (recipe row loading, partial); `common/random.h` 50-82; `common/ruletypes.h` (rule defaults grepped by line). Camera scope: not applicable. Searched for armour durability and repair in `common/` and `zone/` (grep): none found; only AA names containing "Durability" and a faction-repair comment in `zone/client.cpp` 8395-8434. Confidence: high on forage, fishing, skill-up and chance formulas (read in full); high on ground-node respawn; medium on the recipe loader (SQL and table columns partly read); not read: the zone main loop that calls `Object::Process` (so the real tick rate of the respawn check is unknown), the common food list in `ForageItem` (only the names are seen in the code), `SummonItem`, and the NPC ambush spawn beyond its roll.

## 1. Mechanism

Four gathering-related rules, all data-driven by zone rows.

**(a) Foraging.** A forage attempt passes a skill gate: `Int(0,199) < skill`, so the chance is skill/200 (`forage.cpp` 458). A pass then rolls `Roll(ForageChance)` (25 by default, `ruletypes.h` 382): on a hit, the zone's forage table is used; on a miss, or when the zone table is empty, a fixed common-food list is used (8 ids, chosen uniformly; `UseForageCommonFood` default true, `ruletypes.h` 225). The zone table is a set of rows `(item, chance, level)`, filtered by `zoneid = this zone OR zoneid = 0` and `level <= skill`, capped at 50 rows with `LIMIT 50` and no ORDER BY (`forage.cpp` 47, 57). The chances are summed into a running total (87), one roll is made over `Int(1, total)` (102), and the first row whose running total covers the roll is picked (105). A mastery bonus (sum of `ForageAdditionalItems` from AA, item and spell) gives a chance of a second forage in the same attempt; the second forage is called with `guarantee=true`, so it cannot chain again (541-542). Every attempt, pass or fail, makes one skill-up check with modifier 5 (555); the chance inside that check was not read.

**(b) Fishing.** Fishing skill is read with pole and bait bonuses. Above 100 it is halved: `100 + (skill-100)/2` (299). The catch succeeds with `Int(0,175) < skill` (302), so the catch chance is skill/176. A catch then rolls `Int(0, FishingChance) <= skill` (FishingChance 399 by default, `ruletypes.h` 383), which means a zone table item (the same rows-with-chances shape as forage, rolled at 102-105 in `LoadFishing`) or, if the zone has none, a fallback list. The fallback is a 9-entry array: tattered sandals x3, fresh fish x1, fish scales x2, rusty dagger x3 (`forage.cpp` 269-278; the fresh-fish line is 273); `UseNoJunkFishing` (default false, `ruletypes.h` 178) forces fresh fish. A zone fishing row can also name an NPC with an `npc_chance` percent roll (313) that spawns an ambush NPC 3 units away. On a catch, bait is consumed if `use_bait`. The pole breaks with chance 1 in 50 on a catch (429). On a miss, 1 in 5 loses the bait (405). Fishing gets one skill-up check with modifier 5 per attempt (435).

**(c) Ground nodes as zone rows.** Each zone loads up to 50 ground-spawn rows (`zone.cpp` 349; loader `object.cpp` 878-935). A row has a name, a box (`min_x..max_x`, `min_y..max_y`, plus z), `item`, `max_allowed` (copies alive at once), `respawn_timer` (seconds), `fix_z` and `version`. For each row, `zone.cpp` creates `max_allowed` objects (356), each with the row's box. An object's respawn timer is `respawn_timer * 1000` ms (object.cpp 103; the row value is read as seconds because of that multiplier). A click on a ground node starts the timer (585), gives the item to the clicker, and sends a remove-from-client packet to everyone; the node stays in the entity list (only temporary objects are removed). When the timer checks due in `Process` (533), `RandomSpawn` picks a new x and y uniformly inside the box (553-554) and sends a spawn packet. The z is looked up with the map's closest-z call only when the stored z is invalid and the zone has a map (`RandomSpawn`, read to that branch only).

**(d) Recipes as rows, and combines.** A recipe is a row in the tradeskill tables: a success list of `(item, count)` (loaded 1614-1616), a fail list `(item, count)` (`onfail`, loaded 1629-1630), and a salvage list `(item, count)` (loaded 1651-1652). A combine rolls a base chance from the player's skill and the recipe's `trivial` value (below). Success summons the success items; failure summons the fail items and then rolls salvage: for each salvage row and each of its counts, one roll with the item's salvage chance (1205-1212). This salvage comes from a failed combine, not from taken gear.

Combine chance (`TradeskillExecute`, 990-1113): base = `skill - trivial + 66` when trivial < 68 (1077), or `skill - 0.75*trivial + 51.5` when trivial >= 68 (1075). If the raw skill is at or above trivial, the chance is `95 + (skill - trivial)/40`, with no cap in the code (1080, 1095). Below trivial the chance is clamped to 5..95 (1102, 1107). Success if `chance > Real(0,99)` (1113, 1124). GM and remove-traps always succeed. A failed combine halves the stage-1 skill-up chance (success_modifier 2, 1181).

Skill-up (`CheckIncreaseTradeskill`, 1224-1276): stage 1 is `(bonusstat - stat_modifier) / (skillup_modifier x success_modifier)`, floored at the minimum rule 2.5 (1239-1240). Bonus stat is the higher of INT and WIS, or DEX/STR for some trades. Stage 2 depends on the raw skill: below 15 it is 100 (1247); from 15 to 174 it is `(200 - skill)/2` (1250), written with integer division; from 175 it is `12.5 - 0.08 x (skill - 175)` (1253), so 12.5% at 175 and 2.5% at 300. Both stages must pass for +1 skill (1258-1260).

## 2. Key functions

- `ZoneDatabase::LoadForage` (`forage.cpp` 50-113): zone and global rows, cumulative chance, weighted pick.
- `Client::ForageItem` (`forage.cpp` 442-556): skill gate, zone table or common list, mastery second forage, skill-up.
- `ZoneDatabase::LoadFishing` (`forage.cpp` 114-184) and `Client::GoFish` (`forage.cpp` 252-441): fishing skill curve, catch gate, zone item, NPC ambush, bait and pole.
- `Object` ground-node constructor (`object.cpp` 91-130), `Object::Process` respawn check (519-535), `Object::RandomSpawn` (`object.cpp` 548-581), `Object::HandleClick` (`object.cpp` 582-640).
- `Zone::LoadGroundSpawns` (`zone.cpp` 342-365) and `ZoneDatabase::LoadGroundSpawns` (`object.cpp` 878-917).
- `Client::TradeskillExecute` (`tradeskills.cpp` 985-1222) and `Client::CheckIncreaseTradeskill` (`tradeskills.cpp` 1224-1276).
- `Random::Int`, `Random::Roll` (`common/random.h` 50-82).

## 3. Numbers vs mechanism

| Quantity | Formula | Number range | file:line |
|---|---|---|---|
| Forage skill gate | `Int(0,199) < skill` | chance skill/200 | forage.cpp:458 |
| Forage zone table vs common list | `Roll(ForageChance)` | 25% zone table (rule), else common list | forage.cpp:462; ruletypes.h:382 |
| Forage table cap | rows loaded with `LIMIT 50`, no ORDER BY | 50 rows per pool | forage.cpp:47, 57 |
| Forage weighted pick | `Int(1,total)`, first row with running total >= roll | weights are the row chances | forage.cpp:87, 102, 105 |
| Forage mastery | extra forage with `Roll(sum of ForageAdditionalItems)`, no chain | percent bonus | forage.cpp:541-542 |
| Forage skill-up | one `CheckIncreaseSkill` per attempt, modifier 5 (chance inside the call not read) | modifier 5 | forage.cpp:555 |
| Fishing skill curve | `skill` if <=100, else `100 + (skill-100)/2` | soft cap at 100 | forage.cpp:299 |
| Fishing catch gate | `Int(0,175) < skill` | chance skill/176 | forage.cpp:302 |
| Fishing zone item gate | `Int(0,FishingChance) <= skill` | FishingChance 399 (about (skill+1)/400) | forage.cpp:306; ruletypes.h:383 |
| Fishing ambush NPC | `Roll(npc_chance)` | row percent | forage.cpp:313 |
| Fishing fallback weights | 9-entry list, uniform index | sandals 3/9, fresh fish 1/9, scales 2/9, dagger 3/9 | forage.cpp:269-278, 345 |
| Fishing no-junk rule | forces fresh fish | default off | forage.cpp:346; ruletypes.h:178 |
| Pole break | `Int(0,49) == 1` on a catch | 1 in 50 | forage.cpp:429 |
| Bait lost on miss | `Int(0,4) == 1` | 1 in 5 | forage.cpp:405 |
| Node copies | `max_allowed` objects per row | row value, up to 50 rows per zone | object.cpp:909; zone.cpp:349, 356 |
| Node respawn | `respawn_timer * 1000` ms; checked in Process | row value in seconds | object.cpp:103, 533, 910 |
| Node placement | `Real(min,max)` in x and y of the row's box | box size from row | object.cpp:553 |
| Combine base, trivial < 68 | `skill - trivial + 66` | clamp 5..95 below trivial | tradeskills.cpp:1077, 1102, 1107 |
| Combine base, trivial >= 68 | `skill - 0.75 x trivial + 51.5` | same clamp | tradeskills.cpp:1075 |
| Combine at or over trivial | `95 + (skill - trivial)/40` | no cap in code | tradeskills.cpp:1095 |
| Combine roll | success if `chance > Real(0,99)` | 0-99 | tradeskills.cpp:1113, 1124 |
| Fail halves skill-up | `success_modifier = 2` on fail | divisor x2 | tradeskills.cpp:1181 |
| Skill-up stage 1 | `(bonus - stat_mod) / (skillup_mod x success_mod)`, min 2.5 | skillup_mod 1.0 to 4.0 (rules) | tradeskills.cpp:1239-1240; ruletypes.h:147-158 |
| Skill-up stage 2 | <15: 100; 15-174: `(200-skill)/2`; >=175: `12.5 - 0.08(skill-175)` | 92% at 16, 13% at 174, 12.5% at 175, 2.5% at 300 | tradeskills.cpp:1247-1253 |
| Fail salvage | one `Roll(SalvageChance)` per salvage count | item bonus percent | tradeskills.cpp:1205-1212 |
| Recipe rows | success (item,count), fail, salvage (item,count) | per recipe | tradeskills.cpp:1615, 1652 |

## 4. TypeScript sketch

simplified: the sketch keeps the donor order for the weighted pick (one roll over the running total), the node life cycle (click pays only a live copy and starts the timer; the tick re-places it inside its box), and the combine and skill-up formulas. It omits: the forage and fishing skill gates and their item flow, the mastery second forage, the fishing NPC ambush and pole and bait losses, the common food and fish lists, the fail-salvage roll, the GM and remove-traps always-succeed cases, the AA and item bonuses, the skill-up stage-1 bonus-stat selection, and the donor's rule that the over-trivial branch reads the raw skill while the base reads the clamped skill (the sketch uses one skill). It also changes the donor's integer division in the stage-2 mid band to float division (a fix). The z placement and the Process loop are not in the sketch.

```ts
// Licence: GPL-3.0 (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export interface Row { itemId: string; chance: number; }

// Weighted pick from zone rows: one roll over the running total, first row that covers it.
export function pickWeighted(rows: Row[], roll01: () => number): string | null {
  const total = rows.reduce((a, r) => a + r.chance, 0);
  if (rows.length === 0 || total <= 0) return null;
  const roll = 1 + Math.floor(roll01() * total); // 1..total
  let run = 0;
  for (const r of rows) {
    run += r.chance;
    if (roll <= run) return r.itemId;
  }
  return null;
}

// A ground node as a zone row: a box, how many copies are live, and a respawn delay.
export interface NodeRow {
  minX: number; maxX: number; minY: number; maxY: number;
  maxAllowed: number; respawnS: number; itemId: string;
}
export interface LiveNode { x: number; y: number; readyAt: number | null; }

export function placeNode(row: NodeRow, rnd: () => number): LiveNode {
  return {
    x: row.minX + rnd() * (row.maxX - row.minX),
    y: row.minY + rnd() * (row.maxY - row.minY),
    readyAt: null,
  };
}

export function buildNodes(row: NodeRow, rnd: () => number): LiveNode[] {
  return Array.from({ length: row.maxAllowed }, () => placeNode(row, rnd));
}

// Server-side click: only a live node pays out; it then waits for its respawn timer.
export function clickNode(node: LiveNode, row: NodeRow, nowS: number): string | null {
  if (node.readyAt !== null) return null;
  node.readyAt = nowS + row.respawnS;
  return row.itemId;
}

// Tick: when the timer is due, the node is placed again at a random point in its box.
export function tickNode(node: LiveNode, row: NodeRow, nowS: number, rnd: () => number): void {
  if (node.readyAt !== null && nowS >= node.readyAt) {
    Object.assign(node, placeNode(row, rnd));
  }
}

// Base success chance (percent) for a combine. Trivial = recipe difficulty, skill = player skill.
export function tradeskillChance(skill: number, trivial: number): number {
  if (skill >= trivial) return 95 + (skill - trivial) / 40; // at trivial: 95, plus 1 per 40 over
  const c = trivial >= 68 ? skill - 0.75 * trivial + 51.5 : skill - trivial + 66;
  return Math.min(95, Math.max(5, c));
}

// Skill-up stage-2 chance (percent) by raw skill, floored at the minimum rule.
// The donor divides with integer arithmetic here; this sketch uses float division.
export function skillUpStage2(raw: number, minChance = 2.5): number {
  let c: number;
  if (raw < 15) c = 100;
  else if (raw < 175) c = (200 - raw) / 2;
  else c = 12.5 - 0.08 * (raw - 175);
  return Math.max(minChance, c);
}

export {};
```

## 5. Lands in

- TARGET `origins/server/gather-nodes.ts` (proposed new module, the same module as the Veloren note): zone rows for nodes (box, copies, respawn seconds, item), a server-side click that pays only a live copy, and the weighted zone-row pick for forage and fishing tables.
- PARITY ROW 23 (zone population: spawn caps, respawn, despawn): the node copies (`max_allowed`), the respawn timer and the box re-placement are the population rule for nodes. The weighted roll is a row-18 loot roll; it is named in section 6, not claimed here.
- Reuse tag: rewrite-from-idea (GPL-3.0; clean-room only).
- Brief rule served: 1 (one engine, zones as data); zones as data is the rule that makes node rows a zone table.

## 6. Gaps and risks

- GPL-3.0: clean-room only. The sketch was written from the mechanism; no donor lines were translated.
- Defect, fix: the stage-2 mid band uses integer division (`tradeskills.cpp` 1250, `(200 - current_raw_skill) / 2`). Odd raw skills lose half a point (for example 17 gives 91, not 91.5). Fix: float division, as the sketch does.
- Defect, fix: the forage table `LIMIT 50` has no ORDER BY (`forage.cpp` 57). Rows past 50 are dropped in an unspecified order. Fix: order the query, or fail the zone load loudly when there are more than 50 rows.
- Defect, fix: the combine base uses the clamped skill (`tradeskills.cpp` 990-992, 1075-1077), but the over-trivial test uses the raw skill (1080). At the clamp the two disagree. Fix: one skill value for both.
- Design note, decide: the chance jumps at trivial. A skill one point below trivial gives 65 (`skill - trivial + 66`); at trivial it gives 95 (1095). The code comment calls this intended. Frankendom should choose a curve, not inherit the step by accident.
- Node placement is uniform in the box (553-554). The donor checks the closest z on the map but does not check that the point is walkable (not read further). Frankendom zone rows should list valid points or check reachability on the server.
- The respawn check runs inside `Object::Process`; the tick rate was not read. Respawn times are therefore only approximate in the donor. Frankendom's server tick must make the timer exact (server tick is row 18 / post-K item 3).
- Parity row 18 concern: forage and fishing rolls are loot rolls and should be checked against row 18 when built; the mastery second forage is a chain-once rule (541-542) that is easy to get wrong.
- No armour durability or repair exists in this donor (grep of `common/` and `zone/`). Per-piece armour wear and repair are NONE here; the salvage in this donor is only the failed-combine salvage roll (1205-1212), not salvage from taken gear.
- The fishing junk fallback (3 of 9 entries are a rusty dagger, `forage.cpp` 269-278) is a design choice; Frankendom needs its own fallback table as zone data, not as a code list.

Reuse tag: rewrite-from-idea (GPL-3.0; clean-room only)
Brief rule served: 1 (one engine, zones as data); row 23 population for nodes

Best transferable idea: a zone row describes a gathering node (a box, a live-copy count, a respawn delay); the server pays once per live copy on click, starts its timer, and re-places it at a random point in the box when the timer is due.
Decision (proposed): adapt — keep the row-as-node shape and the server-side click that pays only a live copy; set the copies and respawn seconds as zone data, and add a walkability check to the random point, which the donor lacks.
Acceptance: server test on a copper vein row (max_allowed 2, respawn 300 s): the first click pays one copper ore, a second click on the same copy pays nothing, and after 300 s the copy is placed inside the row's box again.
