# DCurrent-openbor (design catalogue, DC017)

Donor tree: /mnt/frankendom-donors/DCurrent-openbor/ (read over ssh only, nothing copied or run).
Asset audit used first: AU014 (`/private/tmp/p2/wave2-haiku/batch3/AU014/DCurrent-openbor.assets.md`). Not repeated here.
Receipts: `receipts.tsv` in this folder (verified with verify_receipts.py).

Donor type: OpenBOR, a sprite-based side-scrolling beat-em-up engine (C, with an embedded script engine). The repo is the ENGINE half only. It ships no sprites, sounds, music or maps (media/ holds only _DUMMY). So it has no creatures, classes, weapons, armour or zones of its own. What it does have is a drawing and combat-schema vocabulary, read below.

Halves:
- Engine half: read in part. Read: engine/source/gamelib (transform.c, pixelformat.c, types.h), engine/source/openborscript (drawmethod.c, commands.c), engine/source/gfxlib (gfx.c, scanline.c, tv2x.c, dotmatrix.c file list), engine/source/defense_fields.def, root README.md, root LICENSE, engine/translation.txt (counted only).
- Data-pack half (game modules: sprites, scripts, sounds, maps): not in the box. media/ is empty. A root listing matched no other folder by name, so no paired donor is in the box.
- Not located: the engine C that applies the defence fields (grep for the field names found only the schema and the script command table).

Licence note: code under a 3-clause BSD-style licence (LICENSE line 1 names Roel van Mastbergen and Senile Team; line 2 names the OpenBOR Team). The text does not name art. No licence was found for the PNG, GIF or ICO files, so they are class C. The README calls the engine royalty free (line 3). That is the repo's own statement about the engine, not about any art. Ideas below are taken as shape only.

## Counts (from the files named and grep)
- creatures: 0. No enemy or creature definitions in the engine half. Those live in the data pack.
- classes: 0. No player or class definitions in the engine half.
- weapons: 0. No weapon items. Combat fields only (section 3).
- gear_sets: 0.
- zones: 0. No maps. Lane layout is the genre, not data.

## 1. Creatures and beasts
None in the engine half. The engine has no creature families, no tiers and no boss patterns of its own. Those come from scripts in the data pack, which is not in the box.

Top 8 striking creatures: none. (creatures = 0.)

## 2. Classes, races, factions
None in the engine half. The engine has no class table. The one structure around actors is the draw method record (openborscript/drawmethod.c), which carries per-actor visual state (section 6). That is not a class.

## 3. Weapons and combat fields
No weapon list. The combat schema is a list of 16 defence fields (defense_fields.def:1-16, count by grep). They cover block (block power, block ratio, block threshold, block type, block damage min, max and adjust), damage (damage min, max and adjust), knockdown, pain, a factor, death config flags, and a meta tag and meta data pointer.

Block ratio is exposed to scripts through the command table (openborscript/commands.c:79). The engine C that applies them was not found by name search. So the block rule itself is not read. Do not treat these fields as a parry model.

Top 5 striking weapons: none. (weapons = 0.)

## 4. Armour and gear
None. No gear sets, tiers or materials in the engine half.

Top 5 striking gear: none.

## 5. Zones and dungeons
None. media/ is empty (only _DUMMY). The README (line 3) names the engine's genre as a side-scrolling gaming engine. The lane layout is the genre, not a shipped map.

Top 5 striking zones: none.

## 6. Item and effect looks worth recreating
These are real engine techniques read in code. They are per-sprite, not per-item, and no asset is shipped with them.

- Blend modes as a fixed table: six blend functions, in this order: screen, multiply, overlay, hardlight, dodge, half (pixelformat.c:612). An alpha value picks one from the table (pixelformat.c:631). Technique: a small named blend set indexed by a number. Ref: engine/source/gamelib/pixelformat.c:612, 631.
- Tint colour composed with a blend: when a tint mode is set, the blend function returned is a combined tint routine that takes the tint's blend (from the same table) and the sprite's alpha blend as its two inputs (pixelformat.c:633-637). Technique: tint = blend(colour, mode) combined with the alpha blend. The tint mode is copied from the draw record (pixelformat.c:83); per-channel tint values sit beside it (pixelformat.c:76-86). Ref: engine/source/gamelib/pixelformat.c:631-637; gamelib/types.h:302.
- Per-row sine shimmer (water and heat): each output row is shifted by a sine table value. Amplitude is per sprite (transform.c:1479), wavelength is 256 divided by a float (transform.c:1517), the phase starts at the first visible row times wavelength (transform.c:1518) and advances by wavelength on each row (transform.c:1580). The row offset is `distortion(s, amplitude) - u` (transform.c:1526). Technique: a per-row horizontal offset from one sine table. Ref: engine/source/gamelib/transform.c:1455-1526.
  Defect (not run): wavelength is divided by a value from the script with no zero check (transform.c:1517). A zero would give an infinite step. Fix: clamp the wavelength to at least 1 when it is set.
- Per-actor alpha, tint colour, tint mode and water settings are all exposed as properties (openborscript/drawmethod.c:25, 172, 179, 186). Technique: one draw record per actor, read and written by script. Ref: engine/source/openborscript/drawmethod.c:25-186.
- Palette load and palette properties (openborscript/drawmethod.c:474 allocate, :523 load). Technique: palettes as loadable records, so one sprite can have recoloured variants. The palette body was not read.
- Screen filters: Scanlines, a 32-bit Scanlines variant, a TV-style scanline variant, Bilinear, Tv2x, and DotMatrix are declared in gfx.c:18-27. Source files are in gfxlib/ (scanline.c, tv2x.c, dotmatrix.c, bilinear.c, scale2x.c, simple2x.c). Technique: named screen filters chosen as an output mode. Ref: engine/source/gfxlib/gfx.c:18-27; gfxlib/scanline.c:65.

## 7. Inspiration for Frankendom
Dom's rule: each idea below is a clearly distinct original, never a copy. Only the shape is taken from this donor.

1. Hit-flash tint (parity rows 10 and 8, hit impact and wounds): a short tint pulse on the struck actor, from one tint colour and one blend mode held in one per-actor record. Keep: tint colour and blend mode as one record. Change: our own colours with a non-colour cue, a pulse length tied to hitstop, not a fixed flash.
2. Heat shimmer and ghost wobble (parity rows 6 and 13, hero actor and specials): a per-row sine offset on a sprite for a spectral move or a boss aura. Keep: a row-based sine offset with amplitude and wavelength as data. Change: our frame clock as the time base, amplitude capped so it stays readable at 375 wide, and off in the low-quality mode.
3. Retro screen filter (parity row 16, colour grade and quality): a named list of output filters (scanline, dot-matrix, soft) selected per device. Keep: a named, selectable filter list. Change: a CSS or WebGL overlay, off by default on phones to save time.
4. Palette-swap variants (parity rows 7 and 15, creature actor and gear dressing): one sprite and many recoloured variants from one palette table. Keep: a palette as a loadable table per variant. Change: our own hue shifts tied to gear tiers in the catalogue, not new art.
5. Defence record per defence type (parity rows 3 and 21, guard, parry and catalogue fields): one record per defence type holding block power, block threshold, block ratio, damage min, max and adjust, knockdown and pain. Keep: one record per defence type, tuned as data. Change: our own field names and our own block rule, since the engine rule was not read here.

## Not read
Engine C source except the files named above (the block-applying code was not located). The data-pack half (not in the box). Palette body. PNG, GIF, ICO and ICNS bodies (names and sizes only, from the audit). Android mipmap PNGs. tools/ (7-Zip, devkitpro, bin, borpak) and all binaries. tests/test_invariant_borpak.c. README compile and contribute sections. Third-party licence texts (7-Zip). The translation file body: 177 msgid entries counted with grep -c; grammar is gettext-style msgid and msgstr pairs; nothing quoted.
