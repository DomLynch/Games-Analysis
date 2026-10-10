# cmangos-mangos-classic (creature-grammar, cell CG006)

Donor: `/mnt/frankendom-donors/cmangos-mangos-classic/` (VPS, read only) | Licence: GPL-2.0 code (`LICENSE` line 2); game content is named as Blizzard Entertainment copyright (`COPYRIGHT.md` line 7). Shape only: no donor numbers, names or lines of code carried over.

Checked: Verdict STRONG. Read in full or in the named ranges: `src/game/Entities/Creature.cpp` (ChooseDisplayId 657-700, scale 338, SelectLevel 1265-1480, rank corpse hold 478, SetSpellList 2426-2459); `src/game/AI/BaseAI/UnitAI.cpp` (spell pick 1190-1260); `src/game/Entities/StatSystem.cpp` (weapon damage 758-772); `src/shared/Util/Util.cpp` (urand 74-78); schema in `sql/base/mangos.sql` (creature_model_info 1078, creature_template 1225-1326, creature_template_addon 1344, creature_spell_list 1413) and `sql/updates/mangos/z2780_01_mangos_creature_spell_lists.sql`. Confidence high on the paths quoted and on the defects; medium on "the box holds no world creature rows" (checked the base dump and the update SQL, not every file). Every quote is in `receipts.tsv` and passed `verify_receipts.py` (75 of 75 across both donors).

Decision: adapt (idea); D1 is fixed in the sketch, D2 and D3 are fixed in the change list (section 2).

Best transferable idea: a creature is a few display models and multipliers plus a weighted ability list whose rows survive a per-spawn roll, so one family yields many distinct spawns.

## 1. What the player sees and feels

At 375 wide you meet a set of creature shapes that come back in many colours and sizes, so a new zone feels populated by old friends. Two spawns of one family can differ: one carries a frontal breath, the other does not, because each spawn rolls which ability rows it keeps. Elite and boss tiers read as a bigger body and a short tell, not as a new model, and idle posture is a per-template setting (stand state, emote), so cousins can sit, slump or stand differently.

Why it is striking, against the four criteria:
- Readable silhouette: the model pool is small (four display slots per template, `MAX_CREATURE_MODEL 4`), so the eye learns a few shapes; a per-template scale moves each one into a size band.
- One signature behaviour: a single swapped ability row per spawn, not a whole new AI.
- One signature effect: a front wedge telegraph. The wedge geometry is in `src/game/Spells/Spell.h` and was not read here, so no effect detail is claimed.
- Could be ours at 20-30 percent resemblance: yes. Our families are rigs, the variant is a tint plus scale, the ability swap is one row. Sound: none in the box.

## 2. The rule behind it (the grammar)

Order of operations at spawn, as the code runs:
1. The template row (`creature_template`, 99 columns, `mangos.sql` 1225-1326) carries the family data: up to four display models with integer weights (`DisplayId1..4`, `DisplayIdProbability1..4`, line 1235), a scale (line 1240), a family, a creature type, a rank (tier, line 1263), multipliers for health, power, armour, damage, experience and the five primary stats, and an optional spell-list id (`SpellList`, line 1317).
2. Display: `ChooseDisplayId` (Creature.cpp 657) adds the weights of the nonzero slots and rolls once (line 678). A slot with weight 0 is never picked. If nothing is chosen, it falls back to the first display of template entry 1 (line 698).
3. Scale: the template scale is applied to the object (line 338). Per-model reach and walk/run speed live in `creature_model_info` (line 1078; 17 rows counted), so a large model reads large in the fight without a new template.
4. Level: drawn once per spawn from the template min to max, inclusive (line 1279). `urand` is inclusive at both ends (`Util.cpp` 76).
5. Stats: the level table gives the base; the template multipliers scale it; rank rates from config scale health (line 1417) and damage (line 1308). The damage multiplier is stored (line 1482) and applied at attack time (`StatSystem.cpp` 766-767).
6. Abilities: `SetSpellList` (2426) copies the template's list. For each row with availability below 100 it keeps the row only if a roll passes (line 2449). Each tick the AI rolls a support gate and a ranged gate (UnitAI 1200-1210, 1224), then collects eligible rows, sums their weights (1239-1240), and picks by weight. All-zero weights mean priority by row position (1194).
7. Re-roll: a boss script calls `SetSpellList` again on a phase change (`boss_marli.cpp` 127), so the availability roll repeats per phase.
8. Rank: corpse hold depends on rank (line 478).

The grammar in one line: a few display models, a few multipliers, and a weighted ability list with a per-spawn availability roll. Few models give many creatures because the variety comes from tier, scale, level and which rows survive. The live world row count is not in the box, so no creature count is claimed for this donor.

Enums (data, names only): creature types 11 (`SharedDefines.h` 1177-1189), families 24 DBC-style entries (1196-1222), elite tiers 5 plus an unknown sentinel (1224-1232).

Defects found (keep the idea, fix the defect):
- D1, availability and gate rolls are off by one. `urand(0, 100)` is inclusive (Util.cpp 76), so the roll has 101 values. A row is removed when `roll > availability` (Creature.cpp 2449), so it survives with (A+1)/101 instead of A/100. The support gate (UnitAI 1200, 1210) and the ranged gate (1201, 1224) do the same. The visible case is availability 0: the row still appears about 1 time in 101 spawns. Fix: roll `urand(1, 100)` and keep when `roll <= A`.
- D2, dead code. The four `modified*` damage variables (Creature.cpp 1338-1346) are computed and never read. The max one drops the base damage term (line 1340). Behaviour is correct today because the multiplier is applied once at attack time (StatSystem 766-767). Fix: delete them. Do not reapply the multiplier to base damage, or it doubles.
- D3, silent model borrowing. A creature with no usable display falls back to the first model of template entry 1 (Creature.cpp 698-700) and logs a support-style error. A bad row therefore shows a stranger's model at runtime. Fix: reject the row at load time and use a reserved placeholder model that is visibly wrong.

Keep: a weighted display pool per template; per-spawn availability on ability rows; rank as a data tier; per-model reach as data; the ability list as a separate table, not hard-coded in the AI.
Change: our family is a rig in the catalogue, not a display id; availability and weights are server-side in the engine; the tint and scale are data fields the client only reads.

Ambient and death, where the donor has it: idle posture and emote per template (`creature_template_addon`, table at `mangos.sql` 1344; rows not in box); corpse hold per rank (Creature.cpp 478; the numbers are config and were not read); a loot reveal ceremony is not in these files (only `LootId`, line 1291); walk density is not in this topic (not read).

## 3. Data fields (ours; donor value null because the donor is GPL)

| name | unit | donor value |
|---|---|---|
| family.model_pool[].model_id | model id | null |
| family.model_pool[].weight | relative weight (0 = never picked) | null |
| variant.scale | ratio, 1 = base size | null |
| variant.tint_id | palette index | null |
| tier.name | enum: normal, elite, rare, boss | null |
| tier.hp_mul, tier.dmg_mul | ratio | null |
| template.level_min, template.level_max | level, inclusive | null |
| ability.rate | chance per try, 0..1 | null |
| ability.delay_ms | ms, per ability | null |
| ability.availability_pct | percent kept per spawn, 0..100 | null |
| ability.weight | relative weight; all zero = list order | null |
| model.reach_m, model.speed_mps | metres, metres per second | null |
| tier.corpse_hold_s | seconds | null |

## 4. Sketch

simplified: the sketch keeps the donor order (display by weight, level inclusive, one availability roll per row, weight pick with list-order fallback). It fixes D1 (keep chance is `rnd()*100 < pct`, so availability 0 never appears). It omits the support and ranged gates, the combat-condition column, the difficulty-specific list lookup, the equipment template, the per-model reach, and the corpse hold. Clean-room sketch; typechecked with `tsc --strict` (exit 0).
```ts
// Licence: GPL-2.0 (donor). Clean-room sketch written from the described shape, not a translation of the donor lines.
export {};

type Weighted<T> = { item: T; weight: number };

// One row of an ability list: a spell the template may cast, with its odds for a single spawn.
interface AbilityRow {
  skillId: string;
  rate: number;            // chance per tick the row is tried, 0..1
  delayMs: number;         // re-cast delay for this row
  availabilityPct: number; // chance this row exists for one spawn, 0..100 (100 = always)
  weight: number;          // relative pick weight among eligible rows; all zero = array order is priority
}

// A template is a family row: few display models, many templates, plus rank and an ability list.
interface Template {
  id: string;
  models: Weighted<string>[];
  scale: number;           // ratio, 1 = base size
  eliteTier: "normal" | "elite" | "rare" | "boss";
  levelMin: number;
  levelMax: number;
  abilities: AbilityRow[];
}

interface Spawn {
  model: string;
  scale: number;
  level: number;
  abilities: AbilityRow[];
}

// roll is in [0, 1). All-zero weights fall back to the first entry (priority by position).
function pickWeighted<T>(pool: Weighted<T>[], roll: number): T {
  const total = pool.reduce((sum, w) => sum + w.weight, 0);
  if (total === 0) return pool[0].item;
  let r = roll * total;
  for (const w of pool) {
    if (r < w.weight) return w.item;
    r -= w.weight;
  }
  return pool[pool.length - 1].item;
}

// Inclusive level roll, then one availability roll per row, once per spawn.
function rollSpawn(t: Template, rnd: () => number): Spawn {
  const model = pickWeighted(t.models, rnd());
  const level = t.levelMin + Math.floor(rnd() * (t.levelMax - t.levelMin + 1));
  const abilities = t.abilities.filter(a => a.availabilityPct >= 100 || rnd() * 100 < a.availabilityPct);
  return { model, scale: t.scale, level, abilities };
}
```

## 5. Lands in

- TARGET `src/fight/creature-grammar.ts` (new module, proposed): resolves a catalogue family, variant and tier into one spawn (model, scale, level, ability rows) on the server. Parity-checklist row 20 (catalogue as runtime source); the sub-line is "spawn roll: model, scale, level, ability availability".
- Reuse tag: donor-idea (GPL-2.0: clean-room shape only).
- Brief rule served: 1 (one engine, zones as data: the family and ability rows are catalogue data, the rolls run in the engine); 2 (100 Pit characters reused across zones: a family serves many zones with different variant and availability).

5-minute look test for Dom (on his phone, 375 wide):
- Build a family card in the Pit: one rig, three sizes with three tints, and one large sibling with the same rig and one swapped wedge ability. Show idle, then mid-fight.
- Ask: can he name the family at a glance (silhouette test)? Does the size read as tier? Does the wedge show before it lands?
- Second card: same tint and size, two spawns, one with the wedge row and one without. If he cannot tell the two apart within a few seconds, the swap is too quiet.

Many-vs-one note: the donor has a combat-condition column per row (`z2810_01_mangos_spell_list_conditions.sql` line 9 adds it; its semantics were not read). That is the place to hang a 2-or-more-attackers gate under our MAX_ATTACKERS = 3 rule.

## 6. Gaps and risks

- Read: server (listed under Checked); data (schema for all creature tables; creature_model_info counted at 17 rows; base sample row for creature_template only).
- Not read: world creature_template and creature_spell_list rows (not in the box; the update SQL holds the table schema only, no INSERT rows); the CombatCondition semantics; CreatureEventAI; the ObjectMgr loaders beyond the lines quoted; Pools; ScriptDevAI creature scripts beyond the one boss call; creature_equip_template; Spell.sql rows; warden modules; any client art, sound or model.
- Half read: server and data pack. Client half: not in the box and no paired client donor in batch 3.
- Risk: "12 families become 100 creatures" is not measured for this donor. Do not quote a creature count from it.
- Risk: D1 changes spawn odds by about 1 percentage point, except for availability 0 where it removes a 1-in-101 leak. Test the fix with a fixed seed and a 10,000-spawn count before changing live odds.
- Risk: the donor's rank rates and corpse hold numbers are config values; none are copied here.
