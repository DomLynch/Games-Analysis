# MrAntares-roBrowserLegacy (design catalogue, DC037)

Donor: /mnt/frankendom-donors/MrAntares-roBrowserLegacy/ (VPS, read-only).
Licence (files say): code is GPL-3.0 (LICENSE:1 "GNU GENERAL PUBLIC LICENSE"; package.json states "GNU GPL V3"). No asset licence in the repo. The game art and most game data are NOT in the box (the user supplies the client files). The src/DB tables are game-derived name and id tables with the header "@author Vincent Thibault, Antares" (class C per AU035). docs/CONTRIBUTING.md:14 says "Do not bring copyrighted material into the project."
Rule for every brief below: recreate as a clearly distinct original, never a copy. Creature and look inspiration is CATEGORY-LEVEL only (class C), because the name tables are game-derived.

Which half I read: the CLIENT half (src/DB data tables, src/Renderer/Effects shaders, src/Audio, src/UI/Components/Enchant, src/Engine/MapEngine excerpts in Entity.js and Skill.js) and the DATA tables in src/DB. The server half is not readable in this box: rathena/ holds only DropYourRathenaHereDontOverride.txt and tools/ (listed this run). Server-side mob stats, spawn tables and drop tables are therefore not read; no spawn or drop numbers below come from the donor.

## Counts (grep counts this run, not a full taxonomy)
- Creature names: 2445 name entries in src/DB/Monsters/MonsterNameTable.js. Sprite-name table src/DB/Monsters/MonsterTable.js (about 3700 id lines, job and NPC sprite names mixed in). Shadow scale table: ShadowTable.js (351 entries).
- Job and class ids: about 350 named ids in src/DB/Jobs/JobConst.js; 79 class skill-tree views in src/DB/Skills/SkillTreeView.js; 27 base-to-mount pairs in src/DB/Jobs/MountTable.js; 88 baby-form entries in src/DB/Jobs/BabyTable.js.
- Skills: 1424 skill records with MaxLv in src/DB/Skills/SkillInfo.js.
- Weapons: 23 base weapon types plus 6 dual-hand combinations in src/DB/Items/WeaponType.js; 72 named sub-types mapped to base types in src/DB/Items/WeaponTypeExpansion.js.
- Gear: 8402 ids in src/DB/Items/ItemTable.js (6430 with class 0, i.e. no alias); 2402 hat view entries (HatTable.js), 204 robe (RobeTable.js), 4 shield (ShieldTable.js); 192 random-option labels in src/DB/Items/ItemRandomOptionTable.js.
- Zones: 4 world regions and 202 map entries in src/DB/Map/WorldMap.js; 1105 display-named maps in src/DB/Map/MapTable.js.
- Effects: 1143 distinct EF_ identifiers referenced in src/DB/Effects/EffectConst.js.

## 1. Creatures and beasts (families, tiers)
Labels are mine. Name tables are game-derived, so each family is described by its structure and cited by id range only.

- Variant triplet per base creature (ids about 2603-2820): every base has a fast role, a solid role and a group-leader role. Name hits: 61 "Swift", 63 "Solid", 57 "Ringleader" in MonsterNameTable.js. Escalation: the role, not the level. Signature: a leader role per pack.
- Reincarnating boss (ids 1916-1925 boss and shadow forms; 2998-3008 escort court; 3039-3041 element reincarnations): one boss sheds named forms and has an escort court. Signature: the forms are separate monsters with their own ids.
- Gilt-carapace beetle family (ids 2161-2173): horn-variant beetles, a queen and egg stages in gold tones. Signature: a metallic-looking family readable by horn shape.
- Water reskin family (ids 2174-2185): 12 water-zone variants of land creatures. Signature: one palette family per zone.
- Four-minion court (ids 1704-1712): four named minions plus one phantom form.
- Elder family (ids 1297, 1305, 1699, 2019, 3193, 3196): aged versions of ordinary creatures (Ancient ...). Name hits: 24.
- Nightmare-mode versions (for example ids 1061, 1379, 2353-2362, 2477-2485): 29 name hits.
- Dark and shadow variants (name hits: 30 "Dark", 20 "Shadow"), juvenile "Baby" forms (17 hits), seasonal reskins (10 hits).
- Training dummies (ids 21064-21076): one per race or size tag (13 tags). These are the only in-client list of race and size tags for creatures.
- Boss families by name recur under several ids (one boss name at six or more ids). Meaning of each id is server data (not read).

Top 8 most striking (readable silhouette at 375 wide, one signature behaviour, one signature sound or effect, could be ours at 20-30 percent resemblance):

1. Gilt-horned beetle family. Why: horn shape alone tells the variants apart; a queen and eggs give a nest feeling. Keep: horn-variant silhouettes, queen plus egg stage. Change: the gold reads from a rim-light shader on a steel-blue carapace, not from a recolour; new horn shapes. Ref: src/DB/Monsters/MonsterNameTable.js (ids 2161-2173, line 1116 holds id 2161).
2. Reincarnating boss. Why: a boss that changes element and splits its court is a fight-within-a-fight. Keep: named forms as separate monsters, escort court. Change: forms triggered by health bands; each form has its own silhouette and sound. Ref: MonsterNameTable.js lines 896 (id 1916), 898 (1918), 902 (1922), 1882 (3039).
3. Pack-leader triplet. Why: one base creature gives three roles, so pack variety costs little art. Keep: fast, solid and leader roles. Change: role cues are a banner, a horn or an aura, never a name. Ref: MonsterNameTable.js lines 1488-1490 (ids 2603-2605), line 1702 (id 2817).
4. Tidewater reskin family. Why: a zone identity from a palette family of twelve. Keep: one palette family per zone. Change: each reskin gets one new behaviour (for example surfacing). Ref: MonsterNameTable.js line 1129 (id 2174) to about line 1140 (id 2185).
5. Four-minion court. Why: four distinct minions plus a phantom give a readable pack around one boss. Keep: four minions, one phantom. Change: each minion has its own silhouette, not four palette swaps. Ref: MonsterNameTable.js line 684 (id 1704), line 688 (id 1708).
6. Elder tier. Why: an age mark on a known creature reads as a tier without a new name. Keep: the "elder" tag as a visual tier with extra ornament. Change: age marks are our own motif. Ref: MonsterNameTable.js line 282 (id 1297), line 679 (id 1699).
7. Race and size training dummies. Why: the race and size tags are a ready test set. Keep: the 13 tags as training targets. Change: in our Pit they become labelled targets with a readout of the active damage modifier. Ref: MonsterNameTable.js line 2424 (id 21064), line 2435 (id 21075), line 2436 (id 21076); tags also in ItemRandomOptionTable.js (ids 87-106 at file lines 98-117; ids 157-162 at file lines 168-173).
8. Seasonal reskin set. Why: a holiday palette over the same silhouette is a cheap event. Keep: silhouette unchanged, palette and one prop change. Change: our event gives one new silhouette per event. Ref: MonsterNameTable.js line 231 (id 1245).

## 2. Classes, races and factions
Tier structure is read from the flags, not from skills. Counts are grep patterns on the DJP argument lists in src/DB/Jobs/JobPropertyTable.js (approximate).
- Novice tier: id 0 (flag isNoviceClass, JobPropertyTable.js line 60).
- First class: about 25 entries (the first-class flag on ids for the six base classes and three expanded ones).
- Second class: about 58 entries, each with a base first-class parent passed as an argument (for example the second-class entry for the knight branch names the swordsman as base, JobPropertyTable.js line 68).
- Rebirth (high) variants: about 39 entries (flag isRebirth, line 30 and 49; example line 95).
- Third class: about 61 entries (isThirdClass); fourth class: about 15 entries (isFourthClass). The third-class entries have up to three base classes (line 154).
- Baby variants: entries with the suffix _B carry the isBaby flag (example NOVICE_B, line 119).
- Mount forms: 27 base-to-mount pairs (src/DB/Jobs/MountTable.js line 17 for the first pair). The table only maps a base job to a mount job; what the mount looks like is not described in this file (not read).
- Progression shape per skill tree: a skill tree view per class (79 views), each skill with a max level, per-level SP cost array and prerequisite list (src/DB/Skills/SkillInfo.js line 20 and line 23 as the example).
- Signature mechanics per class: NOT READ beyond the skill table (per-skill scripts are in the server half, which is not in the box).
Races: the client has no race table. The race tags come from the item option table (section 4).

## 3. Weapons
- Families (WeaponType.js): short blade, sword, two-hand sword, spear, two-hand spear, axe, two-hand axe, mace, two-hand mace, rod, two-hand rod, bow, knuckle, instrument, whip, book, katar, five gun types, shuriken, plus six dual-hand combinations (line 40 example id 28). Weapon types map to motion, trail and sound tables (WeaponTrailTable.js, WeaponHitSoundTable.js, WeaponSoundTable.js, WeaponAction.js).
- Tier visuals: no material tiers in the client. Distinct looks come from sub-type families (72 mapped sub-types) and from the per-type trail effect (WeaponTrailTable.js line 26 for the bow trail, one trail name per base type).
- Special properties: element and size options are in ItemRandomOptionTable.js (section 4), not in a weapon table.

Top 5 striking weapons:
1. Gun family (five types: hand, rifle, gatling, shotgun, grenade). Why: five ranged silhouettes in one family. Keep: the family spread. Change: one shared gun body with three barrel shapes. Ref: src/DB/Items/WeaponType.js lines 29-33 (line 31 holds the gatling type).
2. Dual-hand combinations (six types). Why: two-blade silhouettes with their own motion. Keep: the pairing as its own weapon type. Change: our pairs read as one off-hand prop. Ref: WeaponType.js line 40 (line 40 holds sword plus short-blade).
3. Whip. Why: a long reach silhouette. Keep: reach as the silhouette. Change: a rope-like trail, not a whip crack sound. Ref: WeaponType.js line 26.
4. Instrument. Why: a performance weapon has a readable prop silhouette. Keep: the prop as a weapon. Change: our instrument is a horn with a resonance ring. Ref: WeaponType.js line 25.
5. Book. Why: a spell focus with a page-glow potential. Keep: the focus object. Change: pages glow on cast only. Ref: WeaponType.js line 27.

## 4. Armour and gear
- Sets and tiers: no material tiers exist in the client data. Gear is shown by view ids (hats 2402, robes 204, shields 4; EUC-KR names not quoted).
- How tiers show: the random-option labels (192 ids, src/DB/Items/ItemRandomOptionTable.js) carry armour element tags (ten elements, ids 76-85 at file lines 87-96), race tags (ten races for defence, ids 87-96 at file lines 98-107; ten for attack, ids 97-106 at file lines 109-118), size tags (small, medium, large; ids 157-162 at file lines 168-173; magic-attack size tags ids 187-192 at file lines 198-203), weapon element tags (ids 175-184 at file lines 186-195), and a few unique behaviour labels (for example "Indestructible in battle", ids 185-186 at file lines 196-197).
- Enchant ceremony: src/UI/Components/Enchant/Enchant.js groups results into three colour sets (enchant, upgrade, reset; lines 90-105), each with an intro, success and fail effect, over a dimmed overlay (line 108).
- Metallic and gold looks: not in the client data (sprite art is not in the box). The gold and metal look must come from our own shader.

Top 5 striking gear ideas:
1. Armour-element tag set (ten elements). Why: one armour piece carries a clear element identity. Keep: element tag per armour. Change: six elements, shown as a rim colour. Ref: ItemRandomOptionTable.js file lines 87-96 (ids 76-85).
2. Race-specific defence tag. Why: a clear counter to one creature family. Keep: one race tag per piece. Change: race tags from our own family list. Ref: ItemRandomOptionTable.js file lines 98-107 (ids 87-96; line 98 holds the formless tag).
3. Three-colour enchant ceremony. Why: result colour tells the player the kind of upgrade. Keep: yellow for enchant, blue for upgrade, green for reset, intro then result. Change: our palette and our cue. Ref: Enchant.js lines 90-105 and 108.
4. Size-tag weapon damage. Why: a size counter reads at a glance. Keep: small, medium, large counters. Change: three of our own size classes. Ref: ItemRandomOptionTable.js file lines 168-173 (ids 157-162).
5. Weapon element tag set. Why: an imbued weapon has its element as a visible property. Keep: element on the weapon. Change: the element shows as a blade edge glow. Ref: ItemRandomOptionTable.js file lines 186-195 (ids 175-184).

## 5. Zones and dungeons
- Biomes and map kinds: MapState.js lists map types (village, field, dungeon, arena, free-PK and no-penalty PK zones, guild war, agit, dungeon tiers, PK server, PvP server, skill-deny, turbo track, jail, monster track, poring battle, battlefield, PvP tournament, siege). Map flags (MapState.js MapFlag block, lines 51-62): PVP, GVG, SIEGE, DISABLE_LOCKON (line 56), COUNT_PK, NO_PARTY_FORMATION, BATTLEFIELD, DISABLE_COSTUMEITEM, USECART, SUNMOONSTAR.
- Four world regions (WorldMap.js region comments at lines 6, 1659, 1752, 1885): the first region is the home continent, then eastern kingdoms, far lands and the new world.
- Display-name keyword hits in MapTable.js (keyword counts, not archetype counts): tower 46, castle 50, cave 33, forest 28, desert 18, ice 11, volcano 8, labyrinth 9, abyss 11, lab 25, guild 21.
- Background classes in MapTable.js (grep counts including variants): dungeon-style 360, field-style 229, village-style 67, siege 60.
- Hazards: a PK warning on PK maps (MapState.js line 18 comment), lock-on disabled maps (flag, line 56), and weather presets (rain, snow, sakura, cloud and one more named weather) imported in src/Engine/MapEngine/Skill.js lines 41-45.

Top 5 striking zones:
1. Weather presets per map (rain, snow, sakura, cloud). Why: one weather change per zone is a cheap identity. Keep: weather as a per-map preset. Change: our weather is tied to the zone's biome tag. Ref: src/Renderer/Effects/RainWeather.js, SnowWeather.js, SakuraWeatherEffect.js, CloudWeatherEffect.js; trigger in src/Engine/MapEngine/Skill.js lines 93-117.
2. Lock-on-disabled map flag. Why: a zone rule that changes the fight feel. Keep: a flag per map. Change: our flag also changes the camera. Ref: MapState.js line 56.
3. PK-danger zone warning. Why: a readable zone-danger text on entry. Keep: a warning line on entry. Change: our warning is a colour tint plus a short cue. Ref: MapState.js line 18.
4. Tower-style dungeon floors. Why: a stacked floor is a clear dungeon archetype. Keep: floor names as data. Change: floors are data rows in one zone table. Ref: MapTable.js display names (keyword hits 46 for tower).
5. Siege and agit map kind. Why: a zone with a timed objective. Keep: the timed objective flag. Change: our objective is a shrine hold. Ref: MapTable.js backgroundBmp siege entries (60); MapState.js map types.

## 6. Item and effect looks worth recreating
- Aura ring with bands: SwirlingAura.js (bands at lines 80-92; height profile; spin per 25 ms tick at line 87) with shader src/Renderer/Effects/SwirlingAura.fs. EF_LEVEL99 creates the ring (src/DB/Effects/EffectTable.js lines 4295-4299); EF_LEVEL99_3 is a separate effect id that creates the sparkle bubble (line 4334). Technique: each band has a radius, a tilt, a sweep and a spin; each ring element gets a height from a sine profile.
- Ground aura: src/Renderer/Effects/GroundAura.fs (alpha test then colour multiply, line 17).
- Threshold-keyed glow ring: src/Renderer/Effects/MagicRing.fs line 22 keeps only texels above 0.5 in every channel and sets a fixed alpha (line 25). The same pattern is in MagnumBreak.fs and PropertyGround.fs.
- Bloom with soft knee: src/Renderer/Effects/Shaders/Bloom.js lines 60-61 (threshold 0.88, soft knee 0.45).
- Cartoon edge pass: src/Renderer/Effects/Shaders/GLSL/Cartoon.fs line 23 (edge from two differences, then a power curve).
- Other post passes present by file name only (not read): Shaders/CAS.js, FXAA.js, Vibrance.js, Blind.js, GaussianBlur.js, Upsampling.js.
- MVP marker: src/Engine/MapEngine/Entity.js line 2657 (onMarkMvp) puts a cross on the minimap when a boss spawns; line 248 marks boss monsters from the packet flag.
- MVP reward effect: EF_MVP (src/DB/Effects/EffectConst.js; not read further).
- Lock-on target: src/Renderer/Effects/LockOnTarget.fs (fog and a colour channel tint).

## 7. Technical notes and defects (keep the idea, fix the defect)
- Entity.js line 647: the bow lead time is added in place to the received packet field (pkt.attackMT += delayTime). Idea kept: a lead-time projectile. Fix: keep the lead as a separate value.
- Entity.js line 638: the motion-speed factor is set to 1 with an open question about its origin. Fix: name the factor and derive it from the server field.
- Entity.js lines 641 and 646: literal constants 24.0 and 8 without names. Fix: named constants with units.
- Fog in SwirlingAura.fs line 30, MagicRing.fs line 29 and Level99Bubble.fs: depth is gl_FragCoord.z divided by gl_FragCoord.w, which is window depth times clip w, not a view distance. Fix: pass the view-space distance as a varying. (Read from code; not run.)
- MagicRing.fs line 22: a hard 0.5 threshold on each channel gives aliased edges. Fix: a smoothstep ramp on alpha.
- BGM.js lines 93-150: a track change is a hard switch (no fade). Idea kept: a token that drops stale loads and a resume position when a track returns (line 103 and line 144). Fix: a short crossfade.
- EffectTable.js line 4299 says "per frame" while SwirlingAura.js lines 259-260 use elapsed time over 25 ms. The code is time-based; only the comment is stale.

## Fold-ins by topic (from the Strategy addendum)
- hud-ui: world map regions and map positions in WorldMap.js; minimap MVP cross (Entity.js 2657-2661). Touch UX, input buffer and lock-on forgiveness: NOT READ.
- sound-music: one BGM channel, switched by file name (BGM.js 93-150); in BGM.js there is no layering, no stingers and no per-biome ambience beds. SoundManager.js (265 lines) was NOT read, so the absence of layering is established for BGM.js only.
- progression: skill records with per-level cost arrays (SkillInfo.js), 79 class trees; death penalty NOT READ.
- loot: enchant ceremony (Enchant.js); affix labels (ItemRandomOptionTable.js); drop ceremony and phone inspect flow NOT READ.
- spawns and encounters: server half absent from the box (see the Which half note); client has the boss flag and MVP marker only. Walk density: NOT READ.
- Idle animation vocabulary, death and respawn presentation, boss intro and finisher staging, readability at 375 wide: NOT READ.

## 8. Inspiration for Frankendom (originals, clearly distinct, 20-30 percent mood only)
Rule: recreate as a clearly distinct original, never a copy. KEEP names the trait kept; CHANGE names the trait changed.

1. Gilt Carapace (beetle boss family). Idea: a three-stage beetle family with a horn-variant line, a queen and eggs; gold reads as rim light. KEEP: horn-variant silhouettes, queen plus egg stage. CHANGE: our own horn shapes, steel-blue carapace, shader gold.
2. Shifting Warden (reincarnating boss). Idea: the boss sheds element forms at health bands and leaves an escort court. KEEP: forms as separate monsters, court. CHANGE: forms by health band, one silhouette and one sound per form.
3. Lead-Pack Triplet (variant roles). Idea: every base creature has a fast role, a solid role and a leader role. KEEP: the three roles. CHANGE: role cues are banner, horn, aura.
4. Tide Reskin Set (zone palette family). Idea: twelve palette-family variants for a water zone, each with one new behaviour. KEEP: one palette family per zone. CHANGE: each variant gets one new behaviour.
5. Race-Tagged Dummies (Pit targets). Idea: labelled training targets for each race and size tag with a live readout. KEEP: the 13 tags as the test set. CHANGE: a readout of the active modifier, our own tag names.
6. Three-Colour Enchant Ceremony. Idea: yellow enchant, blue upgrade, green reset, each with intro, result and a dimmed overlay. KEEP: colour-coded result sets and the intro-result rhythm. CHANGE: our palette and cue.
7. Three-Band Level Halo (rank aura). Idea: a ring of three bands that spin and rise and fall with a sine profile, one set per rank tier. KEEP: banded ring with spin. CHANGE: our rank colours and a time-based spin (already time-based in the donor code; keep that).
8. Threshold Glow Ring (keyed alpha). Idea: a bright-only ring that reads as light, with a soft alpha ramp instead of a hard cut. KEEP: keyed bright ring. CHANGE: smoothstep edge, our ring shape.

## licence_note
GPL-3.0 code (LICENSE:1). No asset licence in the repo. Game data is user-supplied and not in the box. src/DB game-derived tables: class C, category-level inspiration only.

## Not read
- The server half (rAthena) is not in the box (placeholder and tools only).
- Entity.js outside lines 248-249, 629-657 and 2650-2690; the rest of src/Engine/MapEngine.
- WeaponAction.js, the per-skill scripts, SkillInfo.js bodies beyond the example records, EffectTable.js beyond the level-99 blocks, the full EffectConst.js.
- All binary and image files (none opened); the 5 JSON and 5 TXT files; MobileUI text; PalNameTable.js; the hat, robe and shield tables beyond their counts.
- Bloom, Cartoon, CAS, FXAA and Vibrance GLSL bodies beyond the lines cited.
- Death and respawn, boss intro and finisher staging, idle animation, readability at 375 wide, touch and lock-on forgiveness.
