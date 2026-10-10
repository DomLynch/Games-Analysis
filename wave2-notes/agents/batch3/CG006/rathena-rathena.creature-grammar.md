# rathena-rathena (creature-grammar, cell CG006)

Donor: `/mnt/frankendom-donors/rathena-rathena/` (VPS, read only) | Licence: GPL-3.0 code (`LICENSE` line 1; `README.md` line 81). Data files carry a GPL-3.0 header, `db/re/mob_db.yml` line 2 "Copyright(C) 2024 rAthena Development Team". The game whose monster data sits in `db/` is not named in the files read, so rights status is unknown: inspiration stays category-level, and monster names appear only as file IDs.

Checked: Verdict STRONG. Read in full or in the named ranges: `src/map/mob.cpp` (mobskill_delay 4228-4268; mobskill_use 4275-4500, with the event -1 condition branch at 4326-4370); `src/map/elemental.cpp` (elemental_create from 42, through the intif call at 136; elemental_change_mode 416-438; size from data 954); `src/map/skill.cpp` (skill_get_elemental_type 14642-14654); `src/map/skills/mage/summonwaterspiritaqua.cpp` (17); `db/re/skill_db.yml` (summon skill 28002-28004); `db/re/mob_db.yml` (header, and the family examples at 6002-6204); `db/re/mob_skill_db.txt` (header and all rows counted); `db/re/elemental_db.yml` (all 17 entries); `conf/battle/monster.conf` (62, 142, 148). Counts are awk/grep over the whole files (commands in section 6). Confidence high on the ability-scan order and the two defects; high on the summon-level finding (checked and found to hold). Every quote is in `receipts.tsv` and passed `verify_receipts.py`.

Decision: adapt (idea), with D1 fixed in the sketch; D2 checked and left as is, with the fix noted.

Best transferable idea: one family name shared across size and element variants, each with one swapped ability row and a per-skill shared cooldown, so a sibling differs by one row.

## 1. What the player sees and feels

A summoned elemental comes as a small, medium or large body of one family, so the same silhouette reads bigger and tougher at 375 wide. Its three modes (passive, assist, aggressive) each fire a different skill, so the same body idles, backs you up, or attacks differently. A monster can also cast while idle, walking, looting or dead, so the ambient feel is data, not script. The family itself is a name shared across several monster IDs that differ by element, size and AI, so one sprite-sized idea shows up in many tints and behaviours.

Why it is striking, against the four criteria:
- Readable silhouette: three sizes per family and ten element tints give a small, readable grid.
- One signature behaviour: one swapped row per variant (the elemental modes), not a new monster.
- One signature effect: none read here; effect IDs are in `doc/effect_list.md` (header only, not read in full).
- Could be ours at 20-30 percent resemblance: yes. Family plus size tier plus one swapped ability row maps directly onto our catalogue.

## 2. The rule behind it (the grammar)

Two data tables carry it. (a) The monster row in `db/re/mob_db.yml` (2,675 entries) holds size, race, element with element level, class, AI and modes. (b) The ability rows in `db/re/mob_skill_db.txt` are keyed by monster ID.

Counts (awk/grep over the full files):
- Element lines 2,671, ten values (Neutral, Earth, Dark, Water, Fire, Wind, Undead, Poison, Ghost, Holy); element level 1 to 4 (1,050 / 707 / 560 / 354). Entries without a line default to Neutral.
- Size: Small 777, Medium 1,321, Large 573 (default Small).
- Race: ten values plus two player races. Class: Boss 732, Event 69, Battlefield 25, Guardian 4 (default Normal). AI: 20 distinct values.
- Modes: nine flag names seen, led by Detector 424, FixedItemDrop 323, Mvp 190, TeleportBlock 158, IgnoreMelee 145. MvpDrops blocks 193.
- Display names: 1,734 distinct names across 2,675 IDs. 499 names carry 1,440 IDs. Some reused names are props or dummy targets, not creature families, so this is an upper bound on families.
- Ability rows: 14,514 rows across 1,941 monsters (median 6 per monster, max 48), using 286 distinct skill IDs. A skill is therefore reused about 50 times on average.
- Row states: attack 7,990, chase 3,255, idle 2,429, angry 383, walk 239, follow 147, loot 58, dead 8, any 5.
- Targets: target 7,848, self 6,099, friend 336, random 114. Conditions: always 10,445, HP below percent 1,668, rude-attacked 673, slaves at most 499, skill-used 294, friend HP 287, long-range attacked 257, attackers at least 161.
- Sharing: 1,454 distinct signatures (state, skill, rate, target, condition) across the 1,941 monsters; 728 monsters share a signature with at least one other. Siblings often carry the same ability list.

Elemental families (`db/re/elemental_db.yml`, 17 rows): four names (Agni, Aqua, Ventus, Tera) at level 100, each in small, medium and large (12 rows, IDs 2114-2125), plus five large rows at level 200, one per element including Poison (IDs 20816-20820). Each row has three mode slots (passive, assist, aggressive) with one skill each.

Summon-variant rule: the summon skill picks its variant by `skill_lv - 1` added to the small ID (`skill.cpp` 14652), and the skill has MaxLevel 3 (`skill_db.yml` 28004), so level 1, 2 and 3 map to small, medium and large. The caster-scaled stats then read `size + 1` as the summon level (`elemental.cpp` 56). That holds only because of this 3-level mapping (see defect D2).

Order of operations for one monster's ability pick (`mobskill_use`, the per-second check with event -1):
1. Scan rows from index 0; a random start only if `mob_ai` has bit 0x100 (4294).
2. Skip a row whose delay has not expired. The delay is shared by every row with the same skill ID, and it is set by the row that cast (`mobskill_delay` 4228-4268; the comment at 4239 says the official rule is per skill).
3. Skip a row whose state does not match the monster's current state (or state "any").
4. Roll the row's rate out of 10,000 before checking the condition (4315).
5. Check the condition: HP percent, attackers on this monster, slaves, rude attacks, skill-used, and so on (4326-4370).
6. Check target and range. If either fails, the scan stops, unless bit 0x1000 is set (4477-4488).
7. Cast, then set the shared delay (4266 and 4269).

Config defaults: `monster_ai: 0` (monster.conf 62), `mob_skill_rate: 100` (142), `mob_skill_delay: 100` (148).

The grammar in one line: a family (display name) times a size tier and an element tint, times an ordered ability list keyed to the monster, with one behaviour mode set. A sibling differs by one swapped row, and cooldowns are per skill, so swapping a skill does not reset a sibling's timing.

Defects (keep the idea, fix the defect):
- D1, the rude-attack count is consumed too early. The condition at 4368 is checked and the count is reset to 0 when it passes (4369). If the target is then missing, or range fails, the scan stops (4477-4488) and no skill is cast, so the reaction is lost. Fix: reset the count only after the cast call returns success.
- D2, not a defect (checked). `int32 i = db->status.size+1; // summon level` (elemental.cpp 56) reads size as the summon level, which looks wrong. It holds only because the class is chosen by skill level (skill.cpp 14652) and the skill has three levels. A fourth level, or an element table that is not small-medium-large, would silently break the scaling (for example, Agni small plus 3 is the Aqua small ID). Fix: pass `skill_lv` into `elemental_create`; the call site already has it (`summonwaterspiritaqua.cpp` 17).
- D3, trivial, not worth a fix: the rate check `rnd() % 10000 > permillage` passes permillage + 1 values out of 10,000, so a zero-rate row fires once in 10,000 checks.

Keep: a family as a shared name across size, element and AI variants; one swapped row per variant; ordered rows with a rate and a shared per-skill cooldown; the rate roll before the condition (cheap rejection); state-keyed rows (idle, walk, loot, dead) as data; the attackers-on-me condition (`MSC_ATTACKPCGE`, 4363-4364).
Change: rates out of 10,000 become 0 to 1 floats in our data; mode flags become named enums; the range-fail rule needs one explicit choice (stop the scan, or skip the row) and a test, because the donor exposes both as a flag.

## 3. Data fields (ours; donor value null because the donor is GPL)

| name | unit | donor value |
|---|---|---|
| family.name | catalogue key | null |
| variant.size | enum: small, medium, large | null |
| variant.element, variant.element_level | enum; level 1 to 4 | null |
| variant.mode_skills.passive / assist / aggressive | skill id | null |
| tier.level | level | null |
| ability.state | enum: any, idle, attack, walk, loot, dead | null |
| ability.rate | chance per try, 0..1 | null |
| ability.delay_ms | ms, shared by skill id | null |
| ability.condition.kind, ability.condition.value | enum; percent, count or level | null |
| ability.target | enum: target, self, friend, random | null |
| engine.max_attackers | count (ours: 3) | null |

## 4. Sketch

simplified: the sketch keeps the donor order (scan, state gate, shared cooldown, rate roll before condition, range gate ends the scan). It fixes D1 by resetting the rude-attack count after a successful pick, shown inside `pickRow` for brevity; in the engine that reset belongs after the cast call returns. It omits the random start, the difficulty and map variants, the target search, the ground-cast branch, the mode-change path, and all of the other condition kinds. Clean-room sketch; typechecked with `tsc --strict` (exit 0).
```ts
// Licence: GPL-3.0 (donor). Clean-room sketch written from the described shape, not a translation of the donor lines.
export {};

type State = "any" | "idle" | "attack" | "walk" | "loot" | "dead";

type Cond =
  | { kind: "always" }
  | { kind: "hpBelowPct"; pct: number }
  | { kind: "attackersAtLeast"; n: number }
  | { kind: "rudeAttacked"; n: number };

// One ability row of a monster. Rows are tried in array order, the first one that passes wins.
interface Row {
  skillId: number;
  state: State;
  rate: number;           // chance the row is tried when its state matches, 0..1
  delayMs: number;        // cooldown; shared by every row that names the same skillId
  cond: Cond;
  inRangeAndTargetable: boolean; // stands in for the engine's range and target gate
}

interface Brain {
  state: State;
  now: number;            // ms
  cooldownUntil: Map<number, number>;
  attackedCount: number;  // hits taken since the last rude-attack cast
  attackersOnMe: number;  // players currently targeting this monster
}

function conditionMet(c: Cond, b: Brain, hpPct: number): boolean {
  switch (c.kind) {
    case "always": return true;
    case "hpBelowPct": return hpPct <= c.pct;
    case "attackersAtLeast": return b.attackersOnMe >= c.n;
    case "rudeAttacked": return b.attackedCount >= c.n;
  }
}

// Returns the row to cast, or null. A failed range or target gate ends the scan (donor default).
function pickRow(rows: Row[], b: Brain, hpPct: number, rnd: () => number): Row | null {
  for (const row of rows) {
    if (row.state !== "any" && row.state !== b.state) continue;
    if (b.now < (b.cooldownUntil.get(row.skillId) ?? 0)) continue;
    if (rnd() >= row.rate) continue;                  // rate is rolled before the condition, as in the donor
    if (!conditionMet(row.cond, b, hpPct)) continue;
    if (!row.inRangeAndTargetable) return null;       // scan stops here
    b.cooldownUntil.set(row.skillId, b.now + row.delayMs);
    if (row.cond.kind === "rudeAttacked") b.attackedCount = 0; // fix: consume the count only on a cast
    return row;
  }
  return null;
}
```

## 5. Lands in

- TARGET `src/fight/creature-grammar.ts` (new module, proposed): resolves a catalogue family, size, element and ability list into one monster or summon on the server, and runs the ordered ability scan. Parity-checklist row 20 (catalogue as runtime source); the sub-line is "ability scan: ordered rows, shared per-skill cooldown, rate before condition".
- Reuse tag: donor-idea (GPL-3.0: clean-room shape only; no data values copied).
- Brief rule served: 1 (one engine: the scan runs in `src/fight`, not in the Pit or the zone client); 2 (100 Pit characters reused across zones: a family and its ability list serve many zones; the attackers gate is the many-vs-one rule under MAX_ATTACKERS = 3).

Server-verified and client presentation: the engine chooses the row and the skill ID; the client receives the chosen skill and plays its telegraph (wind-up ring or wedge) before the hit.

5-minute look test for Dom (on his phone, 375 wide):
- Put three of one family side by side in the Pit: small, medium and large, same silhouette, different tint. Ask if he can tell they are one family at a glance, and whether the size reads as a step up.
- Put one sibling of the same size next to it with a different ability row (a ring or a wedge before the cast). Ask whether the wind-up reads before the hit, and whether he can tell which sibling is which without the name.
- Compare with a flat version where all three are different shapes. If the family version reads faster, the grammar is worth building.

## 6. Gaps and risks

- Read: server (`mob.cpp`, `elemental.cpp`, `skill.cpp`, `mob.hpp` size enum at 114-118, the summon skill file) and data (`mob_db.yml` header and family examples, `mob_skill_db.txt` header and all rows, `elemental_db.yml` all rows, `skill_db.yml` summon entry, `monster.conf` three keys). Client half: not in the box, and no paired client donor in batch 3.
- Count commands (run on the VPS, output only, no files written): entries by `grep -c "  - Id:"`; field values by `grep -E "^    Element:"` and similar, summed; ability rows by `awk -F, "/^[0-9]+,/"` over `mob_skill_db.txt`; signatures by joining columns 3, 4, 6, 10 and 11 per MobID.
- Not read: the rest of `mob_db.yml` (item drops, most monster rows), `mob_summon.yml` (2,526 lines, summon groups), `attr_fix.yml` (element matrix) and `size_fix.yml` (size against weapon), `pre-re/` (1,004 IDs, not compared), `npc/` spawn scripts, the spawn path in `mob.cpp`, the size and element damage math in `battle.cpp`, the rest of `elemental.cpp` (the skill paths, and the mode-change path beyond 416-438), `doc/effect_list.md` beyond its header.
- Idle, ambient, death and loot presentation, where the donor has it: idle and walk and loot and dead rows (counts in section 2; the dead-state rows are few, 8); MVP prize blocks (193) carry the loot ceremony data, but no presentation code was read. Walk density: not in this topic (not read). Readability at 375: size tier and element tint are data; no HUD or camera data in the box.
- Risk: the family count from display names is an upper bound. Some reused names are props. Do not quote it as a creature count.
- Risk: D1 changes which rows fire after a rude attack. Test it with a fixed seed before changing live behaviour.
- Risk: the element and size tables (`attr_fix.yml`, `size_fix.yml`) decide how much a tint or size change hurts the player. Not read, so the look test cannot yet say whether a tint is also a stat change.
