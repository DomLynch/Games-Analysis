# bernatvadell-muonline (design catalogue, DC008)

Donor root (VPS, read-only): /mnt/frankendom-donors/bernatvadell-muonline/ . Paths below are relative to that root.
Asset audit used first: AU006 (`/private/tmp/p2/wave2-haiku/batch3/AU006/bernatvadell-muonline.assets.md`). Its shader and licence findings are not repeated here except where a detail is new.

Rule for every idea below (Dom, 2026-10-11): recreate as a clearly distinct original, never a copy. Each entry names the trait KEPT (mood or mechanic, at about 20-30% resemblance) and the trait CHANGED. This donor is class C: nothing is taken as an instance-level look. Labels are our own category-level names.

Licence note (as the files say): no LICENSE file in the repo. README.md:577 says "educational and research purposes only". No game data is shipped; README.md:120 says Season 20 client data must be downloaded separately. CLAUDE.md:8 says not to commit proprietary game data. Not legal advice.

Which half I read: this is the CLIENT half only (Client.Main and Client.Data, a MonoGame client). The matching server and the Season 20 data pack are NOT in the box. Stats, drop tables, monster levels and item stats are therefore not visible here.

## Counts (from ls, find and grep, not from a full read)
- creatures: 505 monster class entries. 399 top-level `Client.Main/Objects/Monsters/*.cs`, 58 in `Monsters/BloodCastle/`, 48 in `Monsters/NewYearChinese/` (subfolder counts are .cs files). 385 files load a `Monster/Monster<N>.bmd` model path. 33 top-level names carry an "Elite" suffix. 20 are generic `Monster<N>` classes with no name. 59 monster classes call a sound cue.
- classes: 10 distinct class names. 7 are creation choices (`Client.Main/Controls/UI/SelectCharacter/CharacterCreationDialog.cs:94-131`). 3 more appear only as advanced classes in `Client.Main/Controls/UI/Game/MoveCommandWindow.cs:174-176`.
- weapons: 7 item-group families (`Client.Data/ModelType.cs`, item groups 0-6: blade, axe, mace or scepter, spear, bow or crossbow, staff, shield).
- gear_sets: 1 set flag read (ancient set complete, `Client.Main/Networking/PacketHandling/Handlers/ScopeHandler.cs:670-815`). Set contents are not in the repo. 17 wing and cape entries in `Client.Data/ModelType.cs`.
- zones: 110 files in `Client.Main/Worlds/` (about 8 are login, select or load screens).

## 1. Creatures and beasts
Families (from class names, with counts from the file list):
- Elite variants (33 names with "Elite"), e.g. `Client.Main/Objects/Monsters/EliteBullFighter.cs`, `AlphaCrust.cs`.
- Tinted families with a colour prefix: crimson-flame set (13), bloody set (9), gray set (6), underground set (5), cursed set (5), twisted set (3), chaos goblins in four colours (4), monkeys in four colours (4).
- Elemental and beast triads that repeat across zones: elemental beast, elemental knight and devil fairy each appear in three zone variants (ubaid, debenter, nars), e.g. `Monsters/UbaidElementalBeast.cs`, `DebenterElementalBeast.cs`, `NarsElementalBeast.cs`.
- Tree and plant monsters: DeathTree and GrayDeathTree (both among 8 death-prefixed entries, the rest are not trees), swamp ent.
- Brood and cluster objects: spider eggs in three variants.
- Boss pattern: named boss classes with the same base class as normal monsters. Only the model is set in the boss file that was read (e.g. `Monsters/Kundun.cs:16-19`). Boss phase logic is not in the client.
- Escalation with level: NOT in the client (server data). Not read.

Top 8 striking (criteria: readable silhouette at 375 wide, one signature behaviour, one sound or effect, could be ours at 20-30% resemblance):

1. label: "Slow-falling ember flier". why: the death animation plays at 0.22 speed, so the fall reads as a long descent. idle and attack have separate sound cues. keep: slow final fall as a boss-kill moment. change: silhouette, palette, wing shape. ref: `Client.Main/Objects/Monsters/PhoenixOfDarkness.cs:21-49` (model `Monster/Monster56.bmd`, death PlaySpeed at lines 30-32).
2. label: "Hit-reacting hatchling dragon". why: plays its attack cue when it takes damage too, walks at a slower action speed (0.7), and has a death cue. keep: a reaction sound on hit. change: species, model, sound. ref: `Client.Main/Objects/Monsters/BudgeDragon.cs:29-61`.
3. label: "Oversized brute". why: one class scales a common model up by 30 percent so the creature reads bigger at spawn. keep: a fixed scale-up as an elite cue. change: armour, silhouette. ref: `Client.Main/Objects/Monsters/Dreadfear.cs:15` (scale), `:20` (model `Monster/Monster117.bmd`).
4. label: "Cool-rim elite crust". why: monster shader in simple colour mode, a cool cyan tint at high intensity, so the elite glows with no extra effect. keep: tint-only elite glow. change: hue, shape, and cap the intensity for phones. ref: `Client.Main/Objects/Monsters/AlphaCrust.cs:26-28`.
5. label: "Scorched bull elite". why: dark warm tint at lower intensity gives an ember-tinged elite without a new model. keep: warm tint on an existing base. change: species, horns. ref: `Client.Main/Objects/Monsters/EliteBullFighter.cs:22-24`.
6. label: "Walking tree stalker". why: tree-type enemy family; a tree that walks reads well at 375 wide. keep: tree silhouette and bark-leaf palette idea. change: bark, leaves, motion. ref: `Client.Main/Objects/Monsters/GrayDeathTree.cs:18` (`Monster/Monster385.bmd`); `Monsters/SwampEnt.cs:18` (`Monster/Monster324.bmd`). Attack behaviour NOT read (model load only).
7. label: "Elemental beast across zones". why: the same beast family placed as three zone variants, so one family reskins per zone. keep: a family that travels across zones. change: colours and design per zone. ref: `Monsters/UbaidElementalBeast.cs:18` (`Monster/Monster222.bmd`); `Monsters/DebenterElementalBeast.cs`; `Monsters/NarsElementalBeast.cs`. Behaviour NOT read.
8. label: "Brood cluster". why: egg-brood classes make a cluster object act as a monster, a swarm-spawner read. keep: cluster as a hazard object. change: egg design, hatch cue. ref: `Monsters/SpiderEggs1.cs:18` (`Monster/Monster152.bmd`), `SpiderEggs2.cs`, `SpiderEggs3.cs`. Behaviour NOT read.

Sound: 59 monster classes call `SoundController.Instance.PlayBufferWithAttenuation` on idle, attack or death (e.g. `Monsters/BudgeDragon.cs:31-56`, `Monsters/Agon.cs:51-70`). That attenuation pattern is a reusable cue system (idle, attack, hit, death), kept as a pattern and not as sounds.

## 2. Classes, races and factions
Each class gets one line: role, signature mechanic, progression.
- Dark Wizard: ranged caster. Area and target spells (skill IDs 1-10 wizard set, `Client.Data/BMD/SkillDefinitions.cs:17-27`). Progression: base class, then advanced path. Level ranges are special-cased in `Client.Main/Controls/UI/Game/BloodCastleEnterControl.cs:678-681`.
- Dark Knight: melee. Can summon a Dark Knight (skill ID 34, `SkillDefinitions.cs:53`). Progression: base class.
- Fairy Elf: ranged support. Buff effects (`Client.Main/Objects/Effects/ElfBuff*.cs`, names read). Skill IDs 27-52 (`SkillDefinitions.cs:46`). Progression: base class.
- Magic Gladiator: hybrid melee and caster. Advanced class in the move-command set (`MoveCommandWindow.cs:174-176`). Progression: base then advanced.
- Dark Lord: leader. Its own stat row for the "Dark Lord family" (`Client.Main/Controls/UI/Game/Character/CharacterInfoWindowControl.cs:847-945`). Skill IDs 230-270 (`SkillDefinitions.cs:116`). Progression: base then advanced.
- Summoner: summon. Skill IDs 200-225 (`SkillDefinitions.cs:95`). Progression: base class.
- Rage Fighter: martial melee. Skill IDs 230-270 (`SkillDefinitions.cs:116`), a rage blow effect (`Client.Main/Objects/Effects/RagefulBlowEffect.cs`, name read). Progression: base then advanced.
- Advanced names (seen only in `MoveCommandWindow.cs:174-176`): Duel Master, Lord Emperor, Fist Master. Their progression is not read.
- Races and factions: no separate race list in the client. Class selection is the only identity axis read.
- Matching half: the class enum (CharacterClassNumber) is NOT found as a declaration in this repo, so class IDs are unverified.

## 3. Weapons
Families (item groups, `Client.Data/ModelType.cs`): blade (group 0), axe (1), mace or scepter (2), spear (3), bow or crossbow (4), staff (5), shield (6). Spear item 7 is a named polearm (`ModelType.cs`, name only).
Special properties: excellent and ancient flags per hand (`Client.Main/Objects/Player/PlayerObject.cs:885-914`). Set bonuses are not in the client.
Tier visuals: the glow ladder in section 4 applies to weapons too. Weapons also get a trail colour by tier (see section 6).

Top 5 striking:
1. label: "Tier-coloured trail blade". why: the trail colour reads the tier at a glance. keep: trail colour as a tier readout. change: the colour family. ref: `Client.Main/Objects/Player/WeaponObject.cs:138-143` (`GetTrailColor`).
2. label: "Prism edge". why: the excellent tier uses a blue, orange, violet ramp with no green. keep: a three-hue ramp for the top tier. change: hues and the cycle speed. ref: `Client.Main/MGContent/ItemMaterial.fx:125-134` (AU006 covers the shader).
3. label: "Set-complete glow". why: the server sends an ancient set-complete flag, and the NPC shows five ancient armour pieces. keep: a binary set-complete flag that changes the look. change: the visual. ref: `Client.Main/Networking/PacketHandling/Handlers/ScopeHandler.cs:815`; `Client.Main/Objects/NPCS/Leo.cs:25-29`.
4. label: "Staff caster head". why: the staff group is the caster weapon family. Visual NOT read. ref: `Client.Data/ModelType.cs` (group 5). Mark: not read beyond the group id.
5. label: "Long polearm". why: the spear group has a named item (item 7). Visual NOT read. ref: `Client.Data/ModelType.cs` (spear group + 7). Mark: not read beyond the name.

## 4. Armour and gear
Sets: NOT in the client (server or data pack). Only the ancient set-complete flag is read (section 3).
Material tiers (cloth to plate, mythic metals): NOT read. Item stats and material data come from the item BMD reader (`Client.Data/BMD/ItemBMD.cs`, 88 lines, NOT read in full) and the external data pack.
Tiers as the game shows them (from the shader, `Client.Main/MGContent/ItemMaterial.fx`):
- Plain, levels 0-6: no extra layers (lines 208-209).
- Levels 7-8: echo layers at a low ghost intensity (lines 213-216).
- Level 9: stronger echo (lines 219-222).
- Levels 10 and up: a stronger echo. NOTE: `ghostIntensity = 0.7 + (itemLevel / 30)` (line 229) uses integer division on an int, so levels 10-15 all get the same 0.7. This may be a bug. Worth a check before copying the ladder.
- Excellent: any option value above 15 sets the flag (line 195, `ItemOptions / 16 > 0`). Adds the spectrum ramp (section 3) and six echo layers (lines 245-265).
- Ancient: two slow echo layers (lines 241-243, 258-259) and a cool trail colour.

Top 5 striking:
1. label: "Level ladder glow". why: the glow grows in steps from plain to layered. keep: step-up tiers, each more layers. change: step count and colours. ref: `Client.Main/MGContent/ItemMaterial.fx:194-240`.
2. label: "Prism spectrum with echo". why: the excellent tier combines the ramp with six echo layers. keep: ramp plus echo as the top tier. change: palette, layer count (fewer for phones). ref: `ItemMaterial.fx:125-134`, `:245-265`.
3. label: "Slow ancient echo". why: two slow echo layers, a quieter aura than excellent. keep: the slow-echo pacing. change: the colour. ref: `ItemMaterial.fx:241-243`.
4. label: "Wing and cape set". why: 17 named wing and cape entries (Wings of Elf through Cape of Overrule). Wings as a visible status. keep: wing silhouette as a status read. change: all shapes. ref: `Client.Data/ModelType.cs` (wing group, lines near 'ITEM_GROUP_WING_ORB_ETC'); `Client.Main/Objects/Wings/Wing403.cs`, `Wings/WingObject.cs` (names read, behaviour NOT read).
5. label: "Excellent mount". why: the mount system has a faster excellent variant. keep: a faster tier for mounts. change: mount designs. ref: `Client.Main/Objects/Player/PlayerObject.cs:101` (speed constant), `:1784` (excellent vehicle check); `Client.Main/Objects/Vehicle/VehicleDatabase.cs` (mount names read by grep: Dark Horse, Divine Horse, Leviathan, Rider, Ur, Fenril Black and others).

## 5. Zones and dungeons
Biome list: town and hub (Lorencia, Noria, Devias, Elbeland, Santa village, Loren market, event square, stadium, arena), field (Tarkan, Atlans, Icarus, Vulcanus, Ferea, Nars, Debenter, Uruk mountain 1-3, swamps of darkness and peace, valley of Loren, Acheron, Aida, ashen Aida, Crywolf, Nixie's lake, Kubera mine, ignis volcano, tormenta island, lost tower, refine tower), all as `Client.Main/Worlds/<Name>World.cs`.
Dungeon and instance archetypes (count of world files):
- Gate-series gauntlets: Blood Castle 1-8 (8), Chaos Castle 1-7 (7), Devil Square (2), Kalima 1-7 (7), Deep Dungeon 1-5 (5).
- Event instances: Illusion Temple (6 incl. league), Doppelganger (6, incl. snow and underwater variants), Imperial Guardian (4), Kanturu (3), Abyss of Atlans (3), Balgass barracks and refuge (2), Karutan (2).
Hazards and weather (read):
- Lava tile used as a map object: `Client.Main/Worlds/TarkanWorld.cs:45` sets tile type 7 to the lava object. The lava object (`Client.Main/Objects/Worlds/Tarkan/LavaObject.cs`) uses an inverse-destination blend and lit transparency.
- Snow: `Client.Main/Objects/Worlds/Devias/DeviasSnowAmbientEffect.cs`, toggled per settings (`Client.Main/Worlds/DeviasWorld.cs:23-27`).
- Ice zone: `Client.Main/Worlds/DoppelgangerIceWorld.cs:15` (comment says snow).
- Water and grass per zone: water speed, distortion and grass brightness set per zone (`Client.Main/Worlds/LorenciaWorld.cs:55-60`, `NoriaWorld.cs:69-74`, `NewLoginWorld.cs:41-44`).
Top 5 striking:
1. label: "Gate-series gauntlet". why: eight numbered gates that escalate. keep: a numbered series that escalates. change: the theme of each gate. ref: `Client.Main/Worlds/BloodCastle1World.cs` to `BloodCastle8World.cs`; `Client.Main/Objects/Monsters/BloodCastle/` (58 entries, names counted).
2. label: "Lava tile pool". why: lava is a map object with a blend, not a flat texture. keep: lit, blended pool. change: colours, flow. ref: `Objects/Worlds/Tarkan/LavaObject.cs`, `Worlds/TarkanWorld.cs:45`.
3. label: "Ambient snowfall toggle". why: snow is an ambient effect with a settings switch. keep: an ambient layer that can be turned off for low-end phones. change: the flake design. ref: `Objects/Worlds/Devias/DeviasSnowAmbientEffect.cs`, `Worlds/DeviasWorld.cs:23-27`.
4. label: "Frozen instance". why: an ice variant of an instance, a snow read. keep: frozen palette for an instance. change: layout and the monsters. ref: `Worlds/DoppelgangerIceWorld.cs:15`.
5. label: "Per-zone water flow". why: each zone sets its own water speed and distortion. keep: a water-mood parameter per zone. change: the numbers and direction. ref: `Worlds/LorenciaWorld.cs:55-57`, `NoriaWorld.cs:69-71`, `NewLoginWorld.cs:41-44`.

## 6. Item and effect looks worth recreating
- Excellent spectrum and echo: `Client.Main/MGContent/ItemMaterial.fx:125-134, 245-265` (AU006 covers this shader; repeated only for the tier link).
- Level ladder: `ItemMaterial.fx:208-230`.
- Elite gold default: `Client.Main/MGContent/MonsterMaterial.fx:49` (a default warm gold glow colour). Shimmer and metallic gain at lines 169-170, echo at 185-189 (AU006).
- Per-elite tint: `Objects/Monsters/AlphaCrust.cs:26-28` (simple colour mode, cool tint); `EliteBullFighter.cs:22-24` (warm, low tint). Only these two classes set a glow colour. Which other monsters use the monster shader is NOT verified.
- Weapon trail by tier: `Objects/Player/WeaponObject.cs:138-143`.
- Phoenix slow death: `Objects/Monsters/PhoenixOfDarkness.cs:30-32`.
- Elf buff effects: `Client.Main/Objects/Effects/ElfBuffOrbitingLight.cs`, `ElfBuffMistEmitter.cs`, `ElfBuffSparkle.cs`, `ElfBuffTrailParticle.cs` (names read, code NOT read).
- Scroll spell effects: `Client.Main/Objects/Effects/ScrollOf*Effect.cs` (11 files, names read).
- Twisting slash weapon shadow: `Client.Main/Objects/Effects/TwistingSlashWeaponShadow.cs` (name read).
- Lava blend: `Objects/Worlds/Tarkan/LavaObject.cs`.

## 7. Inspiration for Frankendom
1. name: "Ember Flier Boss". idea: a flying fire boss whose final fall is slowed so the kill lands. keep: slow final fall, sound cue on idle and attack. change: silhouette, palette, wing shape, no phoenix shape.
2. name: "Hit-Snort Hatchling". idea: a small dragon that reacts to every hit with its own cue. keep: a reaction cue on hit. change: species, sound, animation.
3. name: "Oversized Brute elite". idea: an elite made by a fixed 30 percent scale-up. keep: scale as the elite cue. change: silhouette and armour.
4. name: "Frost-Rim Elite". idea: tint-only elite glow with a cool rim, no extra model. keep: tint-only elite. change: hue, cap intensity for phones.
5. name: "Walking Tree Stalker". idea: a tree enemy with a bark and leaf palette. keep: tree silhouette. change: bark, leaves, motion, attacks (not read in donor).
6. name: "Elemental Beast Across Zones". idea: one beast family reskinned per zone. keep: family that travels across zones. change: design and colours per zone.
7. name: "Tier-Coloured Trail". idea: weapon trail colour as the tier readout. keep: trail as readout. change: colours.
8. name: "Lava Pool Layer". idea: lava as a lit, blended map object. keep: blend and lit transparency. change: colours and flow.
9. name: "Ambient Snow, Toggle". idea: snow as an ambient layer with a settings switch. keep: switch. change: flake design.
10. name: "Set-Complete Glow". idea: a binary set-complete flag from the server changes the armour glow. keep: flag-driven look. change: the visual and the set rule.

## Not read
- Season 20 data pack (models, textures, maps, sound): not in the repo, not downloaded.
- Server half: not in the box.
- `Client.Data/BMD/ItemBMD.cs` and the item BMD readers: names only.
- Monster stats, levels and drop data: external.
- Monster attack and idle logic beyond the cited lines: the bodies of most of the 399 top-level classes were NOT read. Only the overrides in the cited files.
- BloodCastle and NewYearChinese monster folders: counted only.
- 110 world files: names and grep hits only, not read in full.
- `Client.Main/MGContent/ItemMaterial.fx` lines 1-120 and 266-end, and `MonsterMaterial.fx` beyond the cited lines (AU006 covers these in part).
- Wing behaviour (`Wings/Wing403.cs`, `WingObject.cs`), scroll effects, elf buff effects: names only.
- Class enum (CharacterClassNumber): declaration not found in the repo.
