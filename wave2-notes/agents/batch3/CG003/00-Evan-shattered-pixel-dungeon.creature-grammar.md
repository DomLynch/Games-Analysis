# 00-Evan-shattered-pixel-dungeon: creature-grammar (CG003)

Depth: full. Half read: both (server code: mob classes and spawner; client code: sprite classes). The data pack (sprite sheets, audio, string tables) was not opened. AU001 gives sheet sizes only.
Donor tree (VPS, read-only): /mnt/frankendom-donors/00-Evan-shattered-pixel-dungeon/
Asset audit used first: AU001. Catalogue used: DC001 (its creature families are not repeated here).

## 1. What the player sees and feels (375 wide)
A sewer rat is a small grey scrap that dies in a tap or two. Its pale cousin is the same silhouette in a different colour block, and it bites with a bleed that ticks the hero for a few turns, so the player learns "pale means bleed" in one fight. A fetid rat is a bigger, sicker version that trails a gas cloud. On the same sheet, a mimic disguised as a chest comes in plain, gold, crystal and ebony versions that share one body and one set of animations. The elemental family reuses one body in fire, frost, shock and chaos colours. The feel is "same creature, changed by one thing", not "new creature". Most of the variety comes from the spawn order, not from new art.

## 2. Why it works / is striking
- Readable silhouette: the variants keep the base outline, so a 16 by 15 pixel rat is still a rat at 375 wide.
- One signature behaviour per variant: pale rat bleeds, caustic slime oozes, acidic scorpion oozes on hit and when it is hit.
- One signature effect per variant: the frame block changes, the on-hit effect changes, nothing else.
- Could be made ours at 20-30 percent resemblance: the grammar (one sheet, frame blocks, one swapped rule) is generic. Our creatures can use their own silhouettes and effects.

## 3. The rule behind it
A family is one base class (stats, AI, loot) plus one sprite class on one sheet. A variant is a subclass that changes:
(a) a frame block in the same sheet, picked by an offset. Rat block starts at 0, albino at 16, fetid at 32. Gnoll at 0, exile at 21, trickster at 42. Mimic at 0, gold at 16, crystal at 32, ebony at 48. Caustic slime at 9 on the slime sheet.
(b) one on-hit or on-damage effect (albino rat: a bleed on a coin flip; caustic slime: an ooze on a coin flip; acidic scorpion: an ooze on hit and on being struck while adjacent). Phantom piranha is a piranha subclass that halves incoming damage when the attacker is not adjacent and then slips to a nearby water cell.
(c) sometimes a stat row. The albino has a higher base HP than the rat; the variant is about half again the base. Donor value is not copied.

Spawn rule: each slot in a depth's rotation can swap to its variant with a small chance. The code sets that chance to 1 in 50, times an exotic-chance multiplier. There are 11 base-to-variant pairs (rat/albino, gnoll/exile, crab/hermit crab, slime/caustic slime, thief/bandit, necromancer/spectral necromancer, brute/armoured brute, DM-200/DM-201, monk/senior, elemental/chaos elemental via the random picker, scorpion/acidic).

Depth inside a family: mimic HP grows with its level in a straight line. Piranha HP, defence, attack and damage grow with depth. Elementals step by a region scale that is never below 2 (defence 5 times scale, HP 15 times scale). These are formulas in code.

Boss-adjacent reuse: the dwarf king summons are nested subclasses of base classes (ghoul, monk, warlock, golem), so the boss brings known creatures, not new ones. Read from class declarations only.

## 4. Frankendom mapping
- 700 zones as data: a family row (sheet id, frame-block offset, base stat row) and a variant row (offset, one effect, one stat multiplier). Zones reference families, not classes. That makes 100 Pit characters reusable across zones with no new class per zone.
- Many vs one (max 3 attackers): keep the variant in the spawn group, not in every slot at once. A group of 3 carries at most one variant.
- Server verified: the server picks family, variant and spawn slot, then sends the variant id and frame block. The client only draws the block and plays the effect cue. The bleed or ooze result is decided on the server.
- Keep: 1-in-N alt swap in the spawn group; a sheet with frame blocks; one swapped effect per variant; depth formulas with a floor.
- Change: the Java subclass per variant becomes a data row. The hidden random swap inside the elemental picker becomes an explicit row. Do not stack the base and the variant effect on the same hit. Caustic and acidic both ooze, which is a stacked feel to avoid.

## 5. Five-minute look test (for Dom, on his phone)
Build one zone fragment with four creatures at 375 wide: a base sewer vermin, its pale variant with a bleed tag shown on the first hit, an elemental-tinted variant from the same body, and a mimic prop from the same sheet. Dom answers two questions: can he name the family in one second, and does the variant tag read without text. Second pass: show the same group with the variant rate at 1 in 50 and at 1 in 10 and say which feels like a surprise rather than a pattern.

## 6. Licence and IP
- Code: GNU GPL v3 (LICENSE.txt, lines 1-2; source headers say "either version 3 of the License").
- Art, music and sounds: no asset licence file in the repo. Credits by name in AboutScene.java. Sound samples from freesound: some CC-BY (attribution), some CC0 (AU001). Text in messages/ is protected.
- Status: inspiration only, at category level ("a pale variant of a vermin", "a disguised chest monster"). Recreate as originals: our own sheet, our own silhouettes, our own names. Do not copy frame layouts, sprite art, names, lore text or stat values. Numbers here are not donor values for reuse (donor_value_or_null is null for every field).

## 7. Gaps
- Not read: Mob.java AI body, the full standardMobRotation, Elemental.random body, nested DwarfKing summon bodies (names and extends lines only), the GnollExile and GnollTrickster AI, traps, painters, the sprite pixels, sound, messages/*.properties.
- Counts: 71 .java files in actors/mobs (67 non-abstract top-level classes, including MobSpawner and some helpers; 4 abstract). 16 nested mob classes extend a base mob type (grep match). 81 sprite classes extend MobSprite (of 90 files in sprites/). 11 RARE_ALTS pairs.
- Each count is a grep or class-declaration count, not a runtime census.
