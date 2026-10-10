# Asset audit: endless-sky-endless-sky (AU018)

- Code licence: GPL-3.0-or-later per the copyright file ('Files: *', License: GPL-3+); license.txt is the GPL v3 text.
- Asset licence: mixed, set per path in the copyright file. images/* default is CC-BY-SA-4.0; many subsets are CC0, public-domain (morguefile), CC-BY-SA-3.0, CC-BY-4.0, CC-BY-3.0, Unsplash. Sounds default to public-domain with CC-BY-SA and CC-BY exceptions. Ambient mp3s have no specific stanza.
- Rights-holder status: original open-source game (Michael Zahniser and contributors). Photos and sounds credited per file. No proprietary game data.
- Best class: A (CC0, public-domain and CC-BY files are usable with the stated credit; most ship and outfit art is B, share-alike).

## Asset inventory (VPS: /mnt/frankendom-donors/endless-sky-endless-sky/)
- Ship sprites: images/ship/, 399 png. B.
- Outfit sprites: images/outfit/, 697 png. B.
- Effect frame strips: images/effect/, 899 png (^0..^4, +0..+2 suffixes). B.
- Planet sprites: images/planet/, 420 png. B (subsets not checked).
- Backgrounds: images/land/ and images/scene/ (photos, jpg and png). A for CC0 and public-domain; B for CC-BY-SA-3.0; A with credit for CC-BY-4.0; C for Unsplash.
- Font sheets: images/font/ubuntu14r.png and ubuntu18r.png. C (typeface licence not named).
- Sound effects: sounds/, 244 wav. A for public-domain and CC-BY; B for CC-BY-SA.
- Ambient music: sounds/ambient/, 3 mp3. C (no specific stanza).
- Shaders: shaders/, 22 GLSL files. Code, GPL-3+.
- Game data text: data/, 204 txt files. GPL-3+. Not copied.
- Totals: 6263 png, 649 jpg, 244 wav, 3 mp3 under the asset folders (counts from find).

## Inspiration
- Numbered frame strips (hit sparks ^0 to ^4; thruster +0 to +2) are a cheap effect convention.
- Hulls are grouped by culture in their names, so each faction reads by family silhouette.
- Backgrounds are layered plates, a depth trick to rebuild with our own art.
- Content lives in plain data files: a data-first layout for our own tables.
- Sparse ambient drone suits exploration; compose our own.
- Short layered hit sounds in size tiers (small, medium, large).

## Briefs
1. Culture-family hull set (ref: images/ship/ avgi*, gegno*, hai*; names only).
2. Layered hit-spark strip (ref: images/effect/acuit hit^0.png to ^4.png; names only).
3. Three-frame thruster glow (ref: images/effect/afterburner+0.png to +2.png; names only).
4. Layered backdrop plates (ref: images/land/haze0* CC0 plate).
5. Sparse ambient drone (ref: sounds/ambient/machinery.mp3; listed only, licence unclear).

## Cross-link
- vfx and animation: frame-strip naming for effects and thruster loops.
- camera and zones: layered backdrops and zone-specific drones.
- sound: size-tier hit sounds (asteroid crunch small, medium, large).
- loot and spawns: not checked here.

## Not verified
Pixel sizes, palettes, audio content and the body of most data text. Planet and UI subsets were not checked stanza by stanza.
