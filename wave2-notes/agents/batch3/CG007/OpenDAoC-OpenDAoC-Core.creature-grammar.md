# OpenDAoC-OpenDAoC-Core (creature-grammar, CG007)

Donor/Licence: OpenDAoC-OpenDAoC-Core. Code is GPL-3.0 per LICENSE and README (asset audit AU038). The root gpl.txt is GPL v2 text and the source header says "v2 or later": the files do not settle which applies. No art or audio in the box. Game-data ownership is unknown. Clean-room, shape only. No donor numbers are written into the data fields.
Verdict: STRONG for the pack and split mechanisms. Confidence high on the code read; coverage thin (see gaps). Half read: server (GameServer scripts and the standard mob brain). Not in the box: the NPC template rows (the look and stats come from database rows; the companion OpenDAoC-Database is not here).
Checked (files opened): scripts/mobs/HiberniaMobs/KoalinthShared.cs, KoalinthElder.cs, KoalinthCastellan.cs; scripts/mobs/custom/SplitMob.cs (both classes); ai/brain/StandardMob/StandardMobBrain.cs (PullFriends, lines 275-296). Counts: mobs tree 62 .cs files; namedmobs 199 .cs files (audit AU038).
Best transferable idea: a shared family base where each variant is three ids (template row, pack id, ability spell), and a split boss that copies itself at half health with a level gate and a reset on death.

## 1. What the player sees and feels (375 wide)
A Koalinth camp is a fight with a leader and friends. An elder and a castellan share one brain. When the one in combat holds aggro, idle friends with the same pack id within range wake and join, and a war cry line appears in local chat. The elder and the castellan both apply a melee haste debuff to the player (the spell's value field is 17, its description says attack speed is cut by 17 percent, and its duration field is 45; the duration unit is not verified). A split elite is a big creature that, at half health, tears itself in two: a smaller copy appears beside it, the parent is back to full health, and the copy attacks whoever hit the parent. On death, the copies vanish, the parent returns to its spawn level and size, and nearby contributors get bounty points.

## 2. Why it works, or is striking
- Readable silhouette: the split copy is the same creature at a smaller size step (the size is a field; the copy's model is the parent's model). Two Koalinth variants differ by a template row, a pack id and one spell; their silhouettes come from template rows not in the box.
- One signature behaviour: the half-health split with a message, and the pack pull on aggro.
- One signature sound or effect: the war cry line is the only signature in the read code. Sound: not read.
- Could be made ours at 20-30 percent resemblance: yes. Keep the pack pull and the half-health split. Change the creature kinds, the message, the debuff element and the split direction.

## 3. The rule behind it
Family variant = shared base plus three ids:
- The shared base (KoalinthNpc) loads a template row by id on AddToWorld, sets its brain, and marks itself for database save (KoalinthShared.cs lines 18, 21, 22).
- The brain (KoalinthBrain) sets aggro level 100 and aggro range 300 (lines 33-34). In Think, when it holds aggro and has a target, it calls PullFriends with its pack id and a radius of 1500 (line 44). A war cry line is shown only when the count is above zero.
- PullFriends shares the aggro list with nearby idle standard-brain NPCs that match the filter and have no aggro yet. It returns only the number newly added (StandardMobBrain.cs lines 284-296). So the war cry does not repeat each tick. Checked, not a defect.
- Elder and castellan differ only by: template row id (lines 10), pack id (line 20), and haste spell id (line 23). The haste debuff is a spell built once (ScriptSpells.GetOrCreate) with duration 45 (line 59), value 17 (line 69), range 1500 (line 68).

Split (SplitMob.cs):
- At or below 50 percent health (lines 10, 48), if level is at least the floor plus one step (45 + 2, line 54), the parent loses 2 levels (line 79), heals to max health (line 80), and loses 5 size points with a floor of 20 (line 81).
- A minion is built from the parent's stats, model, size, flags and inventory, with its own brain copied from the parent's aggro level and range (CopyTo, lines 107-150). It is placed at a fixed offset (line 109) and given the attacker as its first target.
- On death, the parent restores its spawn level and size (lines 67-68) and removes its minions. Reward goes to contributors and their group members within a radius (line 191).

DATA FIELDS (donor values are null because the code is GPL):
| name | unit | donor_value_or_null |
|---|---|---|
| variant.template_row_id | row id | null |
| variant.pack_id | string | null |
| variant.ability_spell_id | spell id | null |
| pack_pull.radius | world units | null |
| pack_pull.max_extra | count | null (not in donor) |
| aggro.level, aggro.range | points, units | null |
| haste.value_pct | % | null |
| haste.duration | donor duration unit (not verified) | null |
| split.threshold_pct | % | null |
| split.level_floor, split.level_step | levels | null |
| split.size_step, split.size_floor | size points | null |
| split.heal_on_split | bool | null |
| split.max_alive_minions | count | null (Frankendom cap) |
| split.reward_radius | world units | null |

Sketch typechecked on the VPS (npx tsc --noEmit --strict --target es2020, exit 0).
simplified: the sketch keeps the split order and the cap; it omits the stat copy, the aggro hand-off and the reward loop. It is the donor's order fixed: place the minion first, then mutate the parent.

```ts
export interface MinionHandle { addToWorld(): boolean; }
export interface SplitParent { level: number; size: number; health: number; maxHealth: number;
  spawnMinion(): MinionHandle | null; }
export interface SplitRules { minLevelToSplit: number; levelStep: number; sizeStep: number;
  minSize: number; maxAliveMinions: number; healOnSplit: boolean; }
export function splitOnce(p: SplitParent, r: SplitRules, aliveMinions: number): boolean {
  if (p.level < r.minLevelToSplit) return false;
  if (aliveMinions >= r.maxAliveMinions) return false;
  const minion = p.spawnMinion();
  if (minion === null || !minion.addToWorld()) return false;
  p.level -= r.levelStep;
  p.size = Math.max(p.size - r.sizeStep, r.minSize);
  if (r.healOnSplit) p.health = p.maxHealth;
  return true;
}
```

## 4. For Frankendom
- Mapping: a Koalinth-style variant is one Pit character row: template row (look and stats) + pack id (zone group) + ability id. Many variants share one brain. That is the shape for about 100 Pit characters reused across 700 zones.
- Target file: src/fight/pack-pull.ts (new). Parity row 4 (fight loop: aggro, chase, leash). Server tick sub-line: "server tick: fixed step, input intake, per-tick NPC budget". Pull and split run on the fixed step.
- Many-vs-one: the donor pull has no cap on how many join. Ours caps extras at the MAX_ATTACKERS = 3 limit. The split is also a many-vs-one source: its minions count against the same 3 attackers (the sketch's maxAliveMinions).
- Server-verified: the pull, the split, the level and size reset, and the reward all happen on the server. The client shows the war cry line, the debuff icon, the copy's spawn and the reset.
- Keep: shared base with three-id variants; pull only newly added friends (no repeated messages); split at a threshold with a level gate; reset on death.
- Change:
  1. Defect: the split changes level, size and health before it checks that the minion was placed (SplitMob.cs lines 79-86). If placement fails, the parent is weakened and healed with no minion. Fix: place first, mutate after (sketch splitOnce).
  2. Defect: the minion is placed at a fixed offset (line 109) with no free-tile check. Fix: pick a free tile around the parent, or do not split.
  3. Gap: the number of splits is bounded only by level, not by live minions. Fix: cap live minions at our attacker limit (sketch maxAliveMinions).
  4. Koalinth writes itself to the database on every add (lines 21-22). Fix: write only at template authoring; zone rows are authoritative.
  5. Radius, duration, value and threshold numbers sit in code. Fix: move to data rows.

## 5. A 5-minute look test Dom can judge on his phone
Target file for the look: src/fight/pack-pull.ts, row 4. Stage a three-creature pack at 375 wide: one aggro starts, the two idle friends join with one war cry line. Dom judges: does the pull read before contact; is the three-attacker cap still many-vs-one. Second stage: a split elite at half health: the copy appears beside it with a one-line message. Dom judges: does the copy read as the same creature; does the reset on death read as a respawn. Compare with one stock creature. Style flag on the existing scene: no release rows.

## 6. Licence and IP
Code is GPL-3.0 (with the v2 conflict noted). Game-data origin is unknown. No names, messages or texts are copied. Category-level only: "a splitting elite" and "a pack that wakes together". Recreate as a distinct original: keep the pull and the half-health split; change the creature kinds, names, messages, debuff element and split direction. No legal conclusion.

## 7. Gaps
- Half read: server (scripts and the standard brain). Data half: the NPC template rows are not in the box. Zone, region and startup XML rows are in the box (AU038 read their heads only); they were not used for this creature read.
- Read: 3 of 62 mob .cs files (Koalinth family), plus one custom file (SplitMob.cs, 2 classes). Not read: BPMob, BPMobHigh, BPPortMob, HPMob, the other named mobs (199 files), and the rest of the mobs tree.
- Not read: TryCastSpell's signature and the 25 argument; ScriptSpells.GetOrCreate; the spell effect ids; RewardParticipants internals beyond the loop line; minion placement helpers.
- Death presentation for Koalinth: not read. Idle behaviour: the shiver aura is the only idle-style effect in AU038 and was not re-read here. Loot ceremony: not read. Walk density: not read.
- Readability at 375: no art in the box. Silhouette is inferred from the model rules only. Not seen.
- Checked against the rulings: row 4 (pull and leash), row 13 (specials, for the swapped haste slot, cited from the family), row 18 / post-K item 3 sub-line for the server tick. Row 23 (zone population) is cross-referenced only.

Reuse tag: variant-by-three-ids family base; split-on-threshold boss.
Brief rule served: donor-games-first (an MMO shard donor, judged on the idea), with the Frankendom rulings on server-owned aggro and the attacker cap.

```json
{"donor":"OpenDAoC-OpenDAoC-Core","topic":"creature-grammar","depth":"thin","half_read":"server",
 "paths":["/mnt/frankendom-donors/OpenDAoC-OpenDAoC-Core/GameServer/scripts/mobs/HiberniaMobs/KoalinthShared.cs","/mnt/frankendom-donors/OpenDAoC-OpenDAoC-Core/GameServer/scripts/mobs/HiberniaMobs/KoalinthElder.cs","/mnt/frankendom-donors/OpenDAoC-OpenDAoC-Core/GameServer/scripts/mobs/HiberniaMobs/KoalinthCastellan.cs","/mnt/frankendom-donors/OpenDAoC-OpenDAoC-Core/GameServer/scripts/mobs/custom/SplitMob.cs","/mnt/frankendom-donors/OpenDAoC-OpenDAoC-Core/GameServer/ai/brain/StandardMob/StandardMobBrain.cs"],
 "counts":{"mobs_cs":62,"namedmobs_cs":199,"koalinth_variants":2,"split_classes":2,"mob_files_read":3,"custom_files_read":1},
 "rule":"Family = shared base plus a variant of three ids (NPC template row, pack id, ability spell id) and one brain. Pack pull on aggro shares the aggro list with idle same-pack NPCs in radius and reports only newly added. Split boss: at a health threshold, with a level gate, lose a level step and a size step (floor), heal, spawn a copy with copied stats and the attacker as target; death restores spawn level and size and removes copies.",
 "data_fields":[
  {"name":"variant.template_row_id","unit":"row id","donor_value_or_null":null},
  {"name":"variant.pack_id","unit":"string","donor_value_or_null":null},
  {"name":"variant.ability_spell_id","unit":"spell id","donor_value_or_null":null},
  {"name":"pack_pull.radius","unit":"world units","donor_value_or_null":null},
  {"name":"haste.value_pct","unit":"percent","donor_value_or_null":null},
  {"name":"split.threshold_pct","unit":"percent","donor_value_or_null":null},
  {"name":"split.level_floor","unit":"levels","donor_value_or_null":null},
  {"name":"split.level_step","unit":"levels","donor_value_or_null":null},
  {"name":"split.size_step","unit":"size points","donor_value_or_null":null},
  {"name":"split.size_floor","unit":"size points","donor_value_or_null":null},
  {"name":"split.max_alive_minions","unit":"count","donor_value_or_null":null}],
 "keep":["shared base with three-id variants","pull only newly added friends","split at threshold with level gate","reset level and size on death","copy gets the attacker as first target"],
 "change":["split mutates parent before minion placement is checked (SplitMob.cs 79-86): place first","fixed +10 offset with no free-tile check (line 109)","split count bounded by level only: cap live minions at 3-attacker limit","Koalinth saves itself to DB on every add (KoalinthShared.cs 21-22): write only at authoring","numbers in code: move to data rows"],
 "look_test":"Three-creature pack at 375 wide: one aggro, two idle friends join with one war cry line. Second stage: split elite at half health, copy beside it, reset on death. Dom judges pull readability and copy identity; compare with one stock creature. Style flag, no release rows.",
 "licence_note":"GPL-3.0 with a v2 conflict (AU038); game-data origin unknown; clean-room shape only; no names or messages copied.",
 "tags":["creature-family","swapped-ability","encounter-camp","boss-elite-pattern","new:split-clone","ordered-feedback","naming-grammar"],
 "not_read":["BPMob, BPMobHigh, BPPortMob, HPMob","other 199 named mob files and rest of 62 mob files","NPC template rows (not in box)","TryCastSpell signature and 25 argument","ScriptSpells.GetOrCreate","spell effect ids","RewardParticipants internals","death, loot and walk density for these mobs","client art and sound (none in box)"]}
```
