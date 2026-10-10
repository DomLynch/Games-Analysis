# EQEmu (creature-grammar, CG004)

Donor root (VPS, read-only): /mnt/frankendom-donors/EQEmu/
Donor licence: GPL-3.0 code (LICENSE.md; header of zone/npc_scale_manager.h says GPL v3). Game content: the audit AU018 found no creature art, models, textures or audio in the box; README names the original game owners. Treat all numbers and names as inspiration only (see section 6).
Depth: full for the server mechanism (NPC scaling, special-ability string, race body size, tint id). Thin for data: the row values are not in the box.
Half read: server (zone/, common/). Data half: schema and migrations only (common/database_schema.h, utils/sql/svn/702_aashieldblock_tint_table.sql, utils/sql/svn/710_tint_set_naming.sql, utils/sql/svn/1802_required_doppelganger.sql). Not in the box: seed rows for npc_types, npc_scale_global_base and npc_types_tint (grep: 0 SQL files hold npc_scale_global_base data, 0 INSERT rows for npc_types_tint, 3 npc_types INSERT rows in the doppelganger file). Client half: client_files/ holds CMake, export and import folders only (not read). Paired donor in the box: AAEmu-AAEmu (its client pack is also absent; see that note).
Checked: read zone/npc_scale_manager.h and .cpp in full, zone/npc.cpp around the constructor, ModifyNPCStat and ScaleNPC, zone/mob.cpp ProcessSpecialAbilities, common/emu_constants.h SpecialAbility namespace, common/bodytypes.h, common/races.cpp default-height table, zone/npc.h accessors, zone/gm_commands/scale.cpp call sites. Confidence high on order of operations; medium on the tint slot letter meanings (inferred from texture getters, not confirmed by a seed row). Not read: zone/npc.cpp body beyond the lines named, zone/spawngroup.cpp, client code.

## 1. What the player sees and feels (375 wide)

Design intent, from the code and not from any screenshot (no models or client art in the box): a creature family is one body (a race id) that can appear at several levels. A low-level member is the base size; a higher-level or named member of the same race is drawn at a larger size and in a darker or brighter tint set, so the eye reads "same kind, but worse" before it reads a number. A named creature is recognised by its name (a capital first letter or a '#' prefix, or a rare flag from the data row) and it carries one or more extra abilities from a short tag list. A raid-class creature is tagged separately from a named one. Nothing here is visible as a silhouette until a client reads the race, the texture slots and the tint id, none of which are in the box.

## 2. Why it works / is striking

- Readable silhouette at 375: unknown. The donor encodes size as a float and the default body height is looked up per race and gender (common/races.cpp table; 6.0 is the default for most entries). Size is the cheap readable step; the silhouette itself is not read.
- One signature behaviour: a named creature gets an ability list from a 57-id tag set (zone/mob.cpp ProcessSpecialAbilities). One swapped ability per named row is the signature.
- One signature sound or effect: none read in the server half (sound and VFX are client-side and absent).
- Could be ours at 20-30 percent resemblance: yes. The stat band table, the zero-means-inherit rule and the tag-string grammar are generic design, not art or text.

## 3. The rule behind it

### 3a. Tier type, from name and flags (zone/npc_scale_manager.cpp 554-567)
- Raid target: type 2 (line 558-559).
- Named: type 1 when the rare-spawn flag is set, or the name contains '#', or the first character is upper case (line 562-563).
- Otherwise type 0 (trash, line 566).
- Note: the upper-case rule is a convention, and it misfires on names that start with a capital in a sentence. The data flag is checked first, so the rule is only a fallback.

### 3b. Stat band lookup (zone/npc_scale_manager.cpp 362-406)
- Key: (type, level, zone_id, instance_version). Lookup order: exact key (line 368), then (type, level, zone, instance 0) (line 381), then (type, level, zone 0, instance 0) (line 393). Zone 0 and instance 0 act as wildcards in the lookup; the seed that would confirm the wildcard meaning is not in the box.
- Missing band: returns an empty row, and ScaleNPC logs and returns without scaling (lines 48-57). No nearest-level fallback.
- Load: rows with an empty zone list or instance list are skipped (lines 224-229). A list separated by '|' is expanded into one key per zone and per version (lines 268-349).
- Each band row holds 28 numeric stat columns plus one special-ability string (npc_scale_manager.h lines 28-61): ac, hp, accuracy, slow_mitigation, attack, six base attributes, eight resists (mr, cr, fr, pr, dr, corruption, physical), min_dmg, max_dmg, hp_regen_rate, hp_regen_per_second, attack_delay, spell_scale, heal_scale, avoidance, heroic_strikethrough.

### 3c. Zero means inherit (zone/npc_scale_manager.cpp 26-207)
- Each stat is written from the band only when the creature's own value is zero: for example max HP at line 63 (`always_scale || npc->GetMaxHP() == 0`), and AC at line 59 only when the creature is auto-scaled too.
- IsAutoScaled (lines 594-613) is true only when HP, min and max damage and the core attributes are all zero. A creature with its own HP set is not auto-scaled, so its AC and some regen values are left alone.
- Special abilities from the band are written only when the creature has none and is auto-scaled (line 184), unless the caller forces it.

### 3d. Level change re-runs the band (zone/npc.cpp 3641-3650, 443)
- The constructor calls ScaleNPC once (line 443). NPC::ScaleNPC sets the new level, then ResetNPCScaling, then ScaleNPC again (lines 3642-3649).
- Reset works because every stat the band wrote is recorded as an entity variable "modify_stat_<stat>" (zone/npc.cpp line 2266, through ModifyNPCStat; read back in zone/npc_scale_manager.cpp line 212). Reset zeroes only the stats the band touched.

### 3e. Damage by class and level (zone/npc_scale_manager.cpp 143-146, 413-548)
- If the rule UseNPCDamageClassLevelMods is on (common/ruletypes.h line 615, default true), min and max damage are multiplied by a class-level factor and divided by 220.
- Factor by class group and level band (hard-coded in code, not data): Warrior 220 under level 20 (line 420), 311 at 70 and over (line 441). Druid, Cleric and Shaman 150 under 70 and 157 at 70 and over (lines 449, 452). Default group 210 under level 35, 260 at 60 and over (lines 526, 541).

### 3f. Special abilities as a tag string (zone/mob.cpp 7554-7565; common/emu_constants.h 525-585)
- Format: entries separated by '^', each entry "id,value" (split at mob.cpp 7554; the two-number check at 7558; ability_id read at 7562).
- 57 ability ids (1 to 57, with Max = 58 at line 583), grouped into attacks (Flurry, TripleAttack, Rampage, DualWield), immunities (slow, mesmerize, charm, stun, snare, fear, dispell, melee, magic and more), leash and tether (32, 33), flee rules (36, 37), and aggro rules. MaxParameters is 9 (line 585).
- The string is applied through ModifyNPCStat("special_abilities") (zone/npc.cpp 2332-2333), which clears the old set first.

### 3g. Body size and race (zone/npc.cpp 149-160; common/races.cpp 1398-1511)
- If the row's size is zero or less, the size is the race-and-gender default (npc.cpp 149-150).
- The default table has 732 slots per gender, indexed by race id (male array starts at races.cpp line 1400, female at 1452). Counted in this pass: 319 male and 317 female entries equal 6.0. 24 male entries are 30.0 or taller. Race ids past the array return 6.0 (races.cpp 1506-1507).
- Two races are forced to a fixed size in the constructor (npc.cpp 155-160): LavaDragon to 5 and Wurm to 15, whatever the row says.

### 3h. Recolour by tint set (npc_types_tint; zone/npc.cpp 441, 2175)
- The row keeps one tint id (m_npc_tint_id, npc.cpp 441), which the server sends in the spawn packet (npc.cpp 2175). The client applies the colours (not in box).
- The tint table has seven slots, each with red, green and blue as 8-bit values (utils/sql/svn/702_aashieldblock_tint_table.sql from line 8, the CREATE TABLE). Slot names carry a letter: 1h, 2c, 3a, 4b, 5g, 6l, 7f. The letters match the texture getters (arm, bracer, hand, feet, leg; zone/npc.h 521-525) but the head, chest and gloves letters are inferred, not read in a seed row.
- utils/sql/svn/710_tint_set_naming.sql (line 1) adds a text name to each tint set, so a set is named as data.

### 3i. Attack family and body type (zone/npc.h 253-255, 310, 759-761; common/bodytypes.h)
- Three uint8 fields pick the primary melee, secondary melee and ranged attack message and animation (npc.h 759 comment). The default fallback 28 is set at npc.cpp 350 (condition not read in full).
- Body type: 39 constants (common/bodytypes.h 27 to 65), for example Humanoid = 1 (line 27) and Special = 67 (line 65). The header comment says body types above 64 make a mob invisible (line 25). Body type drives checks such as IsAnimal (npc.h 310) and undead aggro rules (zone/aggro.cpp).

### Data fields (designer-tunable)

| name | unit | donor value |
|---|---|---|
| band_tier (type) | 0 trash, 1 named, 2 raid | null (GPL, game content) |
| band_key level | level 1 to 255 (uint8) | null |
| band_key zone_id, instance_version | id, 0 as wildcard | null |
| band hp, ac, attack, accuracy | hp points / rating | null (values not in box) |
| band min_dmg, max_dmg | damage points | null |
| band resists (8 columns) | rating | null |
| class_damage_mod | multiplier over base 220 (ratio = mod/220) | null (code table, GPL) |
| size_default | float, race and gender table | null |
| tint_id | integer id; 7 slots x RGB 0-255 | null |
| special_ability_tags | "id,value" list, ids 1-57 | null |
| fixed_size_race | size override (code today: 5 and 15) | null |

## 4. For Frankendom

- Map: 700 zones as data. A band table keyed (tier, level, zone) with a zone-then-global lookup (3b) lets a zone override only the creatures it needs, while the 100 Pit creatures stay one set. Keep the order of the lookup: exact zone first, then zone wildcard, then global.
- Zero-means-inherit (3c) is the rule that makes one creature row serve many zones. A per-creature field that is zero takes the band. Keep it. Fix: state the rule in the catalogue, row 21 (catalogue fields), so a zero is never confused with a real zero HP.
- Level change re-bands (3d): good for many-vs-one, because a creature that levels mid-fight picks up the band without a respawn. Keep the reset-then-reapply pair so no stale value survives. Server-verified: the band is computed on the engine (src/fight/<module>.ts is the proposed home; not checked against our repo). Row 21 for the fields, row 18 for the XP award that uses the level.
- Tier from name (3a): do not use a capital letter as the tier. Keep the explicit tier field in the data. The donor's rule is a convenience; ours should be a data field.
- Special-ability string (3f): one swapped ability per named or elite row, as a short tag list the engine reads. Keep the "id,value" grammar and the rule that a named row carries a short list. Row 13 (specials) for the ability, row 2 (AI brain) for when it fires. Many-vs-one: at most 3 attackers, so keep the list short (1 to 2 tags per elite).
- Size (3g): size is client presentation. Keep it as a data float. Do not use it for hit reach; hit reach stays a separate engine field so a big model cannot hit from farther than its server radius. Row 7 (creature actor).
- Recolour (3h): one tint id per row, with the RGB table as data. That is the recolour tier for 100 creatures across 12 families. Server sends the id, client applies the colours. Row 16 (colour grade) and row 7 (creature actor).
- Keep: band table with zero-inherit and level re-band, the id-value tag string, the size default per body with a fixed override flag, the tint id.
- Change: the upper-case naming rule; the hard-coded class damage table (move it to data); the two forced sizes in the constructor (make them data flags); the static bake that writes a shared npc_types row (3 below).

Defects in the donor, with the fix (keep the idea, fix the defect):
1. No nearest-level fallback. A missing band row means no scaling at all (npc_scale_manager.cpp 48-57). Fix: fall back to the nearest level in the same tier and zone, and fail the load in dev builds.
2. Duplicate band keys are dropped silently. Each load uses emplace, which keeps the first row (npc_scale_manager.cpp 275, 294, 314, 336). Fix: detect duplicates at load and report them.
3. Static bake writes the shared row. ApplyGlobalBaseScalingToNPCStatically (npc_scale_manager.cpp 645, 677) updates the npc_types row that every zone uses for that creature, so a bake for one zone changes all zones. Fix: bake per zone key, or use the dynamic path only (zone/gm_commands/scale.cpp 51-53 offers both).
4. Class damage table is code, not data (npc_scale_manager.cpp 417-545). Fix: a data table keyed by class group and level band.
5. Upper-case test uses a plain char (npc_scale_manager.cpp 562). A non-ASCII first byte is undefined in isupper. Fix: test an unsigned char, or use the data flag only.
6. Duplicate names in the stat list: "cr" and "pr" are listed twice (npc_scale_manager.h lines 78 and 82, 80 and 83). Harmless, because the reset runs twice. Fix: list each once.

## 5. A 5-minute look test Dom can judge on his phone

Build one family card on the phone at 375 wide, with our own art or boxes. Four rows, same body shape:
1. Base member: size 1.0, tint set A.
2. Same body, size 1.25, tint set B (warmer), no extra ability.
3. Same body, size 1.25, tint set B, one swapped ability (a short lunge on the first hit).
4. Boss-gate variant: size 1.5, tint set C, and a spurt move that starts under 70 percent HP.
Compare: can you tell row 1 from row 3 in one look at 375? Does row 3 read as "same family, worse" rather than "new monster"? The numbers are our placeholders, not donor values.

## 6. Licence and IP

- Code: GPL-3.0 (LICENSE.md; header of zone/npc_scale_manager.h). Clean-room only: take the shape (band table, zero-inherit, tag string, tint id) and write our own code. Do not copy any function body or table.
- Content: game-derived. The audit (AU018) and the README name the original game owners. No creature art, model or texture is in the box. Inspiration stays at category level: "a sized-up, recoloured member of one body family with one extra ability". Do not reuse race names, ability names or the height table values.
- Donor numbers (height table, class damage factors, band values) are not MIT, Apache or BSD. Donor value is null in the data table above.
- No legal conclusion is drawn.

## 7. Gaps

- Not read: client half (client_files/export, client_files/import), any model, texture or sound, zone/spawngroup.cpp and zone/spawn2.cpp (spawn logic belongs to a separate row), NPC death, respawn and loot presentation, and the body of zone/npc.cpp outside the named lines.
- Data half: seed rows for npc_types, npc_scale_global_base and npc_types_tint are not in the box. The band values and tint RGB values are unknown here. Counts above are from code tables only (height table 732 slots, 57 ability ids, 39 body types, 7 tint slots).
- Tint slot letters beyond arm, bracer, hand, feet and leg are inferred.
- Idle and ambient: zone/npc.cpp SetSimpleRoamBox exists (npc.cpp 3381, npc.h 508); its body is not read, so no roam radius is claimed.
- Readability at 375: silhouette, threat colour, and max enemies per frame are not read.
- Half read: server. The data half is not in the box, so no claim is made about the numbers in any seed row.
