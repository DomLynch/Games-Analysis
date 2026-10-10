# ZaneDubya-UltimaXNA (design catalogue, DC064)

Donor: /mnt/frankendom-donors/ZaneDubya-UltimaXNA/ (Ultima Online client rewrite in C#/XNA)
Licence: GNU GPL v3 or later (dev/Data/credits.txt line 4; License.txt). Code: clean-room, shape and idea only. Game data is Electronic Arts property and is not in the box.
Class: C (per AU060). Inspiration is category level only. Every original below is a clearly distinct design, about 20-30 percent in mood, never a copy. Not a legal opinion.

## Which half I read
- Read: the CLIENT half (dev/Ultima, dev/Content/Shaders, plugins/SeasonChangerPlugin, res/depreciated/ParticleEffect.fx), plus the two data tables in dev/Data (bodytable.cfg, containers.cfg). Those two tables are server-style tables copied from RunUO (bodytable.cfg line 3, containers.cfg line 3).
- SERVER half: not in this box. ReadMe.md line 16 says the project is tested against RunUO 2.6, which is not here. Paired donors named in AU060 (ModernUO server; ClassicUO and crossuo clients) are not read by me.
- DATA pack: the Ultima Online client files (hues.mul, Cliloc, music, maps, art) are not in the box (ReadMe.md line 14). The string table is therefore not present, so I did not count entries. The loader names were read where they appear in code (HueData.cs line 66; AudioService.cs line 71).
- Not part of this catalogue: plugins/ExamplePlugin/ (only the season plugin was read in full; ExamplePlugin not read).

## Count check against AU060
AU060 lists 509 Equipment, 218 Monster, 75 Animal, 19 Human, 4 Sea. My count of the same file gives 1,065 rows with 1,002 distinct IDs: Equipment 651 rows (593 distinct IDs), Monster 293 rows (292 distinct), Animal 92, Human 25, Sea 4. I could not reproduce the AU060 figures, so I used the file. Worth a fix in AU060.

## 1. Creatures and beasts
Creature data in the box is only the body table (dev/Data/bodytable.cfg, 1,065 rows). It maps a body ID to a body type. There are no creature stats, no spawn tables, no art and no escalation by level here (level scaling lives in the server, not in the box).

Families by body type (distinct IDs):
- Monster: 292 IDs. 64 rows carry a name comment (for example lines 920-1001). Named groups I can see by category: armoured brutes (horned, plated and leather variants), dragons (several variant bodies), serpent and multi-head bosses, armoured and mechanical insects, elementals (a lava one is named), undead and spectral types (gargoyle, lich, shadow bosses), a flying bird boss, a tunnel or spirit family, and an animated weapon.
- Animal: 92 IDs. Named ones I read are birds (Parrot line 944, Crow line 945). The rest are unnamed in the file.
- Sea: 4 IDs (for example line 165, "144 Sea").
- Human-typed: 25 IDs, including elf and gargoyle bodies (lines 914-916, 960-961).
- Equipment-typed: 593 IDs. These are gear graphic classes, not creatures (see section 4).

Escalation with level, boss patterns, spawn density: not in this box (server half not present). Not read.

Animation vocabulary per family (ActionIndexes.cs lines 25-57): see section 6.

Top 8 striking (category-level, own labels):

1. **Armoured horned brute with armour-tier variants.** Why: one silhouette, three body IDs for three armour tiers (base, plate, leather), so a tier is a body swap, not a new model. Readable at 375 wide because the big horned silhouette survives the armour. Signature behaviour: three melee attacks, a stumble and a get-hit reaction (ActionIndexes.cs 25-40). Keep: body-ID variant ladder for one family. Change: our own plating shapes and a visible tier colour on the rim. Ref: dev/Data/bodytable.cfg lines 927, 942, 943. Note: ID 281 is typed Equipment at line 248 and Monster at line 943; the later row wins (Body.cs line 60).
2. **Dragon family split into variant bodies (winged, wolf-type, large undead).** Why: several dragon bodies give a ladder without new rigs. Keep: family of dragons split by variant ID. Change: our wing silhouette and element palette. Gap: the monster animation enum has no flying or hover clip (ActionIndexes.cs 25-40), so a flyer needs a new clip. Ref: bodytable.cfg lines 967, 968, 995.
3. **Multi-head serpent boss.** Why: a multi-head outline reads at a distance. Keep: multi-head silhouette and per-head attacks. Change: our head count and attack timing. Attacks have no per-head clip: the monster branch returns a raw action index for MonsterAction (ActionTranslator.cs 197-198), so per-head moves need custom indices. Ref: bodytable.cfg line 929.
4. **Armoured insect and mechanical scorpion.** Why: plated insect silhouettes are very readable and stay on-theme with a metal finish. Keep: insect body with plates and a metallic sheen. Change: our leg count and our metal palette. Ref: bodytable.cfg lines 963 (Iron Beetle), 966 (Clockwork Scorpion).
5. **Lava elemental.** Why: a rock-and-heat body with a hot palette reads as danger. Keep: an elemental made of stone and heat. Change: our glow ramp (not the donor palette) and an idle that is not a plain stand. Ref: bodytable.cfg line 969.
6. **Undead winged gargoyle.** Why: horned, winged, grey-stone silhouette, and the donor already has gargoyle bodies for both sexes and a gargoyle pet. Keep: horned and winged outline in grey stone. Change: our own horn and wing shape, and a spectral glow. Ref: bodytable.cfg lines 960-961 (gargoyle human-typed), 971 (undead gargoyle), 293 (gargoyle pet). Body.cs lines 111-118 define IsGargoyle, but no caller exists in dev/ or plugins/.
7. **Animated weapon creature.** Why: a weapon that comes alive is a strong, readable silhouette at 375 wide, and it bridges weapons and creatures. Keep: the weapon shape itself as the body. Change: our own weapon, its own sound and a glow on the blade. Ref: bodytable.cfg line 991.
8. **Undead caster boss.** Why: a robed caster reads as "magic is coming". Keep: caster boss with a dark aura. Change: give it a real cast clip, because the monster enum has no cast index (ActionIndexes.cs 25-40; only the humanoid enum has Cast_Directed and Cast_Area). Ref: bodytable.cfg line 992 (Primevil Lich, body ID 830).

Bonus, not in the top 8: a flying bird boss (bodytable.cfg line 1000 "Phoenix Bird"). The rebirth idea is not read (behaviour is server side).

## 2. Classes, races and factions
- Races in code: Human (= 1) and Elf (= 2) in the enum (dev/Ultima/Data/Races.cs lines 16-17). The character creator hard-codes race to Human (CreateCharAppearanceGump.cs line 33) with a comment marking where a race picker would go (line 116). So Elf is a data value only.
- Gargoyle: a body set (IDs 666, 667, 694, 695; Body.cs lines 115-118). Defined, no caller found. Gargoyle bodies are typed Human in the body table (lines 960-961). Gargoyle is a race in the data, not in the creator.
- Classes or professions: none in the box.
- Factions: none in the box.
- Skill builds at creation: three skill slots, each a drop-down over the skill list (CreateCharSkillsGump.cs line 97; SkillsData.DefaultLength = 55 in dev/Ultima/Resources/SkillsData.cs; the names come from Skills.mul, which is not in the box). Each slot is a 0-50 slider, defaults 50, 50, 0 (lines 87-89). The defaults sum to 100, and the paired-slider code (lines 101-104) moves points between the three sliders. Whether the total is clamped at the caller was not read. Progression shape as read: pick three skills, a shared point total, max 50 each.
- Attributes at creation: three sliders, range 10-60, defaults 60, 10, 10 (lines 68-70). Sum of defaults is 80. The paired-slider code moves points between sliders (HSliderBar.cs lines 168 and 173).
- Magery spell list: 64 spells in 8 circles of 8 (SpellsMagery.cs line 18 loop; circle comments at lines 38 and 101). Each spell lists reagent costs (Reagents.cs: 8 "britannia" and 5 "pagan" reagents, lines 24-29). Each entry carries its circle number, icon ID and reagent list (SpellsMagery.cs line 39 is the first entry). Unlock rules are not in the client.

Top striking (class C, category-level): (a) the paired-slider budget (three stats with a fixed total and per-stat caps); (b) the magery circle ladder of eight tiers with reagent costs; (c) the gargoyle body set as a separate race body; (d) the human-typed elf body (IDs 605-607) as a data-only race; (e) skill-slot picking from a fixed list of 55 with a 100-point budget.

## 3. Weapons
- No weapon items, weapon stats, tiers or special properties are in the box. The item data is client-side (not in the box).
- What is here: weapon families by stance, through humanoid action indices (ActionIndexes.cs 60-90). One-handed (Attack_1H, line 71), unarmed (two variants, lines 72-73), two-handed (down, across, jab; lines 74-76), bow (Attack_Bow line 80, Attack_BowX line 81), and mounted versions (lines 88-90). The enum has 36 humanoid entries.
- Visual difference between weapons is therefore a stance difference (a different attack clip), not a tier difference.
- Special properties (elemental, set bonus): none in the box.

Top 5 striking (stance-level):
1. Animated weapon creature (bodytable.cfg line 991): a weapon as an enemy.
2. Two-handed three-attack set (down, across, jab; ActionIndexes.cs 74-76): three readable swings from one weapon class.
3. Bow with a second draw (Attack_Bow 80 and Attack_BowX 81): two clips for one weapon, so a bow reads as a charged shot.
4. Mounted attack set (Mounted_Attack_1H line 88): one attack set per riding state.
5. Stance-driven idle: the humanoid walk case switches to a war-mode walk when war mode is on (ActionTranslator.cs, Walk case; indices in ActionIndexes.cs 60-90). Readable as "armed".

## 4. Armour and gear
- Sets: none in the box.
- Material tiers (cloth to plate, mythic metal): none in the box. The only material lever is the hue ramp. The table holds up to 4096 hues (HueData.cs line 29 for 2048 rows per texture, and the hue count in the file header). Skin tones 56, hair tones 48, text tones 1024 (Hues.cs lines 9, 23, 37).
- How the game shows gear (what I can read): gear is a body class (Equipment-typed body IDs, 593 distinct), not a list of items. A carried light source changes the walk set to the armed walk (ActionTranslator.cs 55-56).
- Containers: 30 gump rows plus one default, each with a rectangle, a drop sound and an optional item whitelist (containers.cfg, for example line 20 "0x41" row with a whitelist of six item IDs).

Top 5 striking (look and mechanism level):
1. Brightness-ramp finish: the art's grey level picks a colour from a ramp per hue (IsometricWorld.fx lines 78-86). A neutral sprite takes any metal finish. Ref: dev/Content/Shaders/IsometricWorld.fx.
2. Partial hue for trims: grey pixels take the ramp, coloured pixels stay (IsometricWorld.fx lines 90-95). Gold trim on steel survives. Ref: same file.
3. Locked chest with a whitelist and its own drop sound (containers.cfg line 20). Ref: dev/Data/containers.cfg.
4. Armed walk when a light is carried (ActionTranslator.cs 55-56). Gear changes the stance, not just the sprite.
5. Equipment body class table (dev/Data/bodytable.cfg, Equipment rows). Gear keys off the body class.

Licence and caution: the hue and shader code is GPL v3. Write our own shader; use the shape only.

## 5. Zones and dungeons
- Biomes, maps, regions, dungeon archetypes and hazards: none in the box. Map data and region data are client files (not in the box, ReadMe.md line 14). The map loader code is present (dev/Ultima/World/Maps/Map.cs) but the files are absent.
- Season is the only zone-level variant in the box: Spring 0, Summer 1, Fall 2, Winter 3, Desolation 4 (dev/Ultima/Data/Seasons.cs lines 15-20). Default is Summer (Map.cs line 195).
- Season swap: a plugin maps static item IDs to four seasonal variants (summer, fall, winter, desolation) and rewrites the displayed ID when a map chunk loads (plugins/SeasonChangerPlugin/SeasonChangerModule.cs lines 55 and 61; Map.cs line 127). The table has 93 entries. 23 map Desolation to ID 1, which the file's own comment says hides grass ("not drawn in desolation", line 67). Whether ID 1 renders as nothing was not read.
- Weather: a weather packet is registered (WorldClient.cs line 85), but its handler only calls AnnounceUnhandledPacket (line 1274). The body of AnnounceUnhandledPacket (line 1052) was not read. So weather is not drawn.
- Lighting as a zone dial: one overall level and one personal level combine into a single light value (IsometricLighting.cs line 54, clamped to 0-30 then divided by 30).

Top 5 striking (what is there):
1. Desolation season (SeasonChangerModule.cs line 67): a wasteland swap by item ID, so a biome is a table, not new art.
2. Chunk-load swap (Map.cs line 127): season applied as the chunk streams in, so the change is local.
3. Overall plus personal light (IsometricLighting.cs line 54): a day-night dial plus a personal light, which is a good zone dial.
4. Weather hook (WorldClient.cs line 85): packet registered, not drawn. Free hook for a rain or snow layer.
5. Single-line death screen (dev/Ultima/UI/WorldGumps/YouAreDeadGump.cs line 22): a minimal presentation, a useful counterpoint.

## 6. Item and effect looks worth recreating
Each row names the technique and a file a human can open.

- **Hue ramp recolour.** One sprite, many hues: the grey level picks a column from a hue row (IsometricWorld.fx 60-101; the 4096-row hue table is loaded in dev/Ultima/Resources/HueData.cs lines 29-101).
- **Partial hue (trim survives).** Only neutral pixels take the tint (IsometricWorld.fx 90-95).
- **Lighting mix.** The pixel shader blends a fixed 0.8 base with a 0.2 term scaled by the normal's dot with the light (IsometricWorld.fx 114), so faces never go fully dark.
- **Ground shadow pass.** Opaque pixels write one half-transparent dark pixel, gated by a stencil (IsometricWorld.fx 159-168; the stencil setup in C# was not read).
- **Minimap colour key.** A magenta pixel is replaced by the minimap texture (IsometricWorld.fx 120-127). Hazard: any real magenta pixel is replaced too. Fix: use an alpha mask.
- **Minimap rolling texture.** A 256 px texture, 48 by 48 block cache of 8-tile blocks; a full redraw only when the centre jumps more than one block (MiniMapTexture.cs 38-39, 66-67).
- **Minimap reticle blink.** A small white 1x1 texture drawn at the centre, blinking every 250 ms (MiniMapGump.cs 27, 115, 125-127). The blink timer runs in Draw, so it follows the draw rate.
- **Minimap size cycle.** Hidden to small to large to hidden (MiniMapGump.cs 46 and 131-135).
- **Lightning flash.** A 10-frame UI sprite sequence that tracks the source each update (LightningEffect.cs 55; LightningEffectView.cs 40-41).
- **Projectile.** Travel time is distance times 75 ms per tile, position is a straight lerp, rotation from atan2 (MovingEffect.cs 145, 160, 165). An impact child is queued at launch and fires when the projectile ends (EffectManager.cs 56 and 112).
- **Constant-acceleration particle.** Position is the integral of a linear velocity change, computed in the shader with no per-frame CPU work (/mnt/frankendom-donors/ZaneDubya-UltimaXNA/res/depreciated/ParticleEffect.fx lines 79 and 82). This file is in res/depreciated and is not wired into the active path that I read. The server's extended particle packets are not handled (EffectManager.cs 37).
- **Animal and monster idle set.** Graze, fidget, lie-down for animals; fidget 1 and 2 and a misc action for monsters (ActionIndexes.cs 38, 48, 54, 56).
- **Carried light changes the walk.** Walk-armed and run-armed sets when a light source is carried (ActionTranslator.cs 55-56).
- **Season swap by item ID.** A four-column table per static ID (SeasonChangerModule.cs 55, 67).
- **Stencil shadow for opaque sprites** as listed above.

Animation notes (where seen):
- Idle and ambient vocabulary: animal idles are graze, fidget, lie down (ActionIndexes.cs 48, 54, 56). Monster idles are fidget 1 and 2 (38-39). Humanoid idles are fidget 1 and 2 (67-68) plus war-mode stances.
- Monsters have no run clip: Run returns the Walk index (ActionTranslator.cs 189). Design gap, not a bug.
- Death: monsters and animals have forward and back death clips (ActionIndexes.cs 30, 57) chosen by a direction flag. The player death screen is a single label (YouAreDeadGump.cs 22). No respawn logic in the client.
- Boss intro, finisher staging: none in the client.
- Readability at 375 wide: not applicable (desktop UI). I did not search for threat colour coding.

### Defects found (keep the idea, fix the defect)
Each item keeps the donor idea. The Decision for each is adapt (idea), with the defect fixed in our sketch.

- **D1. Hue expansion uses integer division.** HueData.cs line 83: `const float multiplier = 0xff / 0x1f;` evaluates to 8, not 8.23, so the top 5-bit value maps to 248 instead of 255. Fix: `const float multiplier = 255f / 31f;`. Idea kept: 5-bit to 8-bit expansion into two lookup textures.
- **D2. Projectile target branch writes the source.** MovingEffect.cs line 128: `base.SetSource(xTarget, yTarget, zTarByte);` in the target branch. Also the target branch has no else for a missing target (lines 106-130), so the target stays at (0,0,0). Fix: `SetTarget(xTarget, yTarget, zTarByte)`, and an explicit else that drops the effect or aims at the source. Idea kept: travel time from distance, impact child on arrival.
- **D3. Frame length mismatch.** AEffect.cs line 50 divides by 50 ms, the comment says 20 ms. Not decided which is intended. Fix: pick one, match the server's durations, correct the comment. Idea kept: frame-indexed sprite effects.
- **D4. Light direction overwritten.** IsometricLighting.cs line 59 `m_LightDirection = 1.2f;` runs on every recalc, so the LightDirection setter (line 42) has no effect. m_LightHeight (lines 21, 48) is never read in the direction vector (line 60 uses z = 1). Fix: remove the overwrite, use the height as the z term after checking the sign. Idea kept: overall plus personal light.
- **D5. Disposed music stays cached.** AudioService.cs line 73 caches each track; line 99 disposes the current one. The cache is never cleared, so a later PlayMusic for the same ID reuses a disposed object. ASound.Dispose and Play were not read. Fix: drop the cache entry on stop, or recreate. Idea kept: track cache keyed by ID.
- **D6. Body table duplicates.** 63 IDs appear twice, four with conflicting types (281, 283, 769, 795). Body.cs line 60 keeps the last row. Fix: one row per ID, and a check at load. Idea kept: body-ID to class table.
- **D7. Shader colour key.** IsometricWorld.fx line 124 (magenta key). Fix: an alpha mask in the minimap atlas.
- **D8. Negative coordinates.** MovingEffect.cs lines 163-164 cast with (int) (truncates toward zero) and use % 1 (negative offsets). Fix: Math.Floor.
- **Dead code (no callers in the box):** ToGrayScale (IsometricWorld.fx line 20); RandomExplosion (ParticleData.cs line 80); IsGargoyle, IsEquipment, IsSea, IsEmpty (Body.cs lines 111, 208 and others; no callers outside Body.cs). Note: the donor's "Utility" class (used by RandomExplosion) is not in the box, so the RandomValue bound was not read.

## 7. Per-topic fold-ins (Strategy topics)
- hud-ui: minimap (section 6), container gumps (section 4), death label (section 5). Touch UX, input buffer, lock-on forgiveness and accessibility: not in this client, not read.
- sound-music: track streaming in 32 KB chunks, about 0.9 s, kept at three pending buffers (UOMusic.cs 24, 75). Track switch is a hard cut, no crossfade (AudioService.cs 83-89). No stingers, no ambience beds, no border crossfade found (searched for stinger, ambien, crossfade, fade). Music file names come from a music table not in the box.
- progression: paired-slider budgets (section 2). No talent trees, death penalty, achievements, titles or cosmetic unlocks in the client. Hair and skin tone lists are cosmetic choices only (Hues.cs; HairStyles.cs).
- loot: container whitelist and drop sound (section 4). No drop ceremony, rarity colour or rarity sound in the client.
- spawns and encounters: server half, not in the box. Walk density not read.

## 8. Inspiration for Frankendom (distinct originals, category level)
Each is a new design. The "keep" trait is the donor idea, the "change" trait is what makes it ours.

1. **Armour-tier brute.** One brute body; the zone's data field picks a body variant per armour tier. Keep: one body, variants by tier, no extra rig. Change: our plate shapes, a tier-coloured rim, and an armour-break clip. Rows 7 and 23.
2. **Brightness-ramp finish.** Grey art indexed by brightness into a per-finish ramp; trims keep their colour. Keep: ramp per finish, partial mode for trims. Change: our hard specular band and a separate channel for hit flash so the highlight survives. Rows 15 and 16.
3. **Winged creature with its own fly clip.** Winged silhouettes as separate body IDs. Keep: wing family by body ID. Change: we add the flight clip the donor lacks, and a glide on the death fall. Row 7.
4. **Projectile with impact child.** Travel time from distance; an impact child fires on arrival. Keep: time from distance, impact on arrival. Change: an arc with a cap, and the target fix from D2. Rows 10 and 13.
5. **Locked chest with a whitelist and its own drop sound.** Keep: each container is data (gump place, drop sound, whitelist). Change: a drop sound tied to rarity and a rim glow when a valid item hovers. Row 18.
6. **Season swap at chunk load.** Keep: static ID to variant table, applied when the chunk loads. Change: a per-zone season field in zone data, not per chunk; our own variant art. Zones are data on one runtime.
7. **Two-number light level.** Keep: overall light plus personal light, combined and clamped. Change: fix D4, and add a per-zone night dial. Row 16.
8. **Paired-slider stat budget.** Keep: fixed point total moved between paired sliders with per-stat min and max. Change: our three stats and class caps, with a visible total. Progression and build diversity.

## Licence note
Code is GPL v3 or later (credits.txt line 4). Shape and idea only; write our own code. Data tables were copied from RunUO (bodytable.cfg line 3; containers.cfg line 3), and the RunUO licence is not in the box. Client game data is not in the box and is Electronic Arts property (credits.txt line 16).

## Not read or not verified
- Server half (RunUO-style logic): not in the box. No escalation, spawns, loot or XP numbers.
- Client data (hues.mul, Cliloc, maps, art, music names): not in the box. Loader code read at the cited lines only.
- ASound and Play (base audio class), AnnounceUnhandledPacket body, the stencil setup, Utility.RandomValue, plugins/ExamplePlugin, doc/CodeAudit.txt, and the minimap loop bounds.
- The shader's blend state and whether the output alpha is premultiplied (IsometricWorld.fx line 105): not checked in the C# blend setup.
- HairStyles.cs and Chairs.cs: not read.
