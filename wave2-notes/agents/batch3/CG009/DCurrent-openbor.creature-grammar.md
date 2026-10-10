# DCurrent-openbor (creature-grammar, cell CG009)

Donor/Licence: engine code under a 3-clause BSD-style licence (LICENSE:1-2, Senile Team and OpenBOR Team). No art, sound or map is shipped (media/ holds only a dummy file), so no art licence exists in the box. README.md:21 says the original Beats of Rage used assets from SNK Playmore's King of Fighters series; no art tracing to that line may be used. Class C for any art. Shape only.

Checked: ENGINE half only, read in part: engine/source/gamelib/pixelformat.c (blend table and tint path, lines 605-640), engine/source/openborscript/drawmethod.c (palette allocate and load, around lines 474 and 523), engine/source/gamelib/transform.c (per-row shimmer, lines 1455-1580), LICENSE, README.md. The DATA pack (sprites, scripts, sounds, maps) is not in the box, and no paired donor for it was found. So there are no creature families here to read. Confidence: high that the engine has no creature data; medium on the palette body (not read).

Best transferable idea: one body per actor with a palette and a tint pass on the same sprite, so element variants are colour passes, not separate sprite sheets.

Verdict for this topic: PARTIAL (thin). The engine has no creatures, families, tiers or bosses. The one technique that fits creature grammar is the per-actor palette and tint record.

## 1. What the player sees and feels
Nothing in this half is a creature. What it offers is a visual mechanism: a single actor record holds an alpha, a tint colour and a tint mode, and when a tint mode is set the drawing switches to a combined tint routine. On a phone this would let one body flash or take an element colour for a moment without a new sheet. Whether that reads at 375 wide was not tested; no sprite is shipped.

## 2. Why it works, and is it striking
- Readable silhouette at 375 wide: NOT checked (no sprite shipped in the box).
- One signature behaviour: none in the engine half.
- One signature effect: a tint pass composed with a blend mode (pixelformat.c:633-637; O05, O06).
- Could be made ours at 20-30 percent resemblance: the palette-and-tint record is generic enough; the creature shape would have to come from our own catalogue.

## 3. The rule behind it
- Blend table: six named blend functions in a fixed order (screen, multiply, overlay, hard light, dodge, half), held in one array (pixelformat.c:612; O04). An alpha number from 1 to 6 picks one (pixelformat.c:629-631).
- Tint path: if the tint mode is above zero, the chosen blend is replaced by a tint routine that takes the tint's own blend (from the same table) and the alpha blend as its two inputs (pixelformat.c:633-637; O05, O06).
- Palette records: a blank palette can be allocated (drawmethod.c:474; O07) or loaded from a path onto a target (drawmethod.c:523; O08). One sprite can therefore have recoloured variants.
- Per-row shimmer (heat or ghost wobble): each row is shifted by a sine table; wavelength is 256 divided by a script value (transform.c:1517; O09), and the phase advances by the wavelength each row (transform.c:1518, 1580; O10).

Data fields (no donor numbers copied; the engine has no tuned values here):
- blend_mode_index | index 1 to 6 | null
- tint_mode_index | index 1 to 6 | null
- tint_colour_channels | 0 to 255 per channel | null
- palette_path | file key | null
- shimmer_amplitude | pixels | null
- shimmer_wavelength | rows | null (must be above zero)

## 4. For Frankendom
- Creature family: one actor draw record per creature, with a palette pass per element or tier, is the cheap way to show a family in several colours (parity row 7 creature actor; row 15 gear dressing for tier tints; row 16 colour grade).
- The palette and tint are client-only (camera, HUD and sound are client-only in our rulings). The server stays with the element values: resist pair, projectile key, status. The client picks the colour pass from the element id.
- The engine's tint-plus-blend idea gives a short hit flash in the element colour (row 10 hit impact), tied to hitstop, not a fixed time.
- Keep: one body, one palette per variant, a single tint record per actor. Change: colour is never the only cue (a projectile or a shape change must carry the element too, for colour-blind players and at 375 wide); our palettes come from the catalogue's element and tier rows, not art shipped here.

Defect found (keep the idea, fix the defect):
- transform.c:1517 divides by a script-set wavelength with no zero check (O09). A zero would make the row step infinite. Fix: clamp the wavelength to at least 1 when the script sets it, or reject zero in the script command. The shimmer idea itself (a per-row wobble for a ghost or heat aura) is kept, with the amplitude capped so it stays readable at 375 wide.

## 5. Five-minute look test
In the fight scene behind a look flag: one walker with two looks, plain and tinted, plus a short tint pulse on hit. Then remove the colour and keep only the projectile change. Dom checks on his phone at 375 wide: is the element readable from the tint alone, and does the pulse read as a hit? If the tint alone fails, the projectile cue is the one to keep.

## 6. Licence and IP
Code: 3-clause BSD-style (LICENSE:1-2). Adaptation of a shape or a small routine would keep the copyright notice. The idea here is a mechanism (blend table, tint routine, palette record), not code, and nothing is copied. Art: none in the box; the README line about King of Fighters assets (README.md:21; O03) means no art from that lineage. No legal conclusions.

## 7. Gaps
- Not read: the palette body (drawmethod.c palette functions beyond the signatures); the engine code that applies the 16 defence fields in engine/source/defense_fields.def (the applying code was not found); PNG, GIF, ICO and ICNS files (names and sizes only, from AU014); tools/ and binaries; tests; the translation file (177 entries counted by grep, not quoted).
- Half read: engine only (client rendering and script). Data pack absent. No paired donor for the data pack found in the box.
- Where seen: idle, death, respawn, loot ceremony, walk density, readability at 375 wide: none in the engine half.
- Catalogue (DC017) and audit (AU014) were used first; their claims were re-checked for the lines cited here.
