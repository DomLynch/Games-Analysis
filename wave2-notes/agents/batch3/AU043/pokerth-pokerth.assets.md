# pokerth-pokerth (asset audit, cell AU043)

Donor: /mnt/frankendom-donors/pokerth-pokerth (VPS, read-only). Half read: data pack (data/), plus the QML resources licence text. Client and server C++ code (src/) not read for assets. No paired donor in this batch.

## 1. Licences (as the files say)
- Code: GNU AGPL v3 or later (COPYING line 1; README line 201). README also gives an OpenSSL linking permission under section 7 (README line 203).
- Assets: "have their own, partly different licenses and authors", listed in data/data-copyright.txt (README line 205, 207).
- Card-deck group in src/gui/qt6-qml/resources/cards-simple: LGPL 3.0, GPL 3.0 text incorporated by reference (cards-simple-attribution.txt line 18).
- Fonts: SIL OFL 1.1 for Noto Color Emoji, Montserrat, PT Serif, Orbitron (data-copyright.txt lines 23, 100-101, 107, 112-113). DejaVu Sans Bold: Bitstream Vera licence with DejaVu changes public domain (line 17).
- Sounds, avatars, several decks and table PNGs: source URLs or 'donated by' lines only, no licence line.

## 2. Asset inventory (paths and rough counts)
- Fonts: data/fonts/ (DejaVuSans-Bold.ttf, NotoColorEmoji.ttf), 11M. QML resources also carry Inter-VariableFont.ttf.
- Card decks (QML, SVG): data/gfx/qml/cards/ (11 folders, about 54 files each for discworld, default, lemming); cards-simple/ 52 SVG. Discworld folder 5.6M. Lemming 644K. Default 316K.
- Card decks (Qt Widgets, PNG): data/gfx/cards/default (56 entries, 1.7M).
- Card backs (QML): data/gfx/qml/backside/ (16 folders); GUI backs: data/gfx/gui/backside/ (3 folders).
- Table art: data/gfx/qml/table/ (20 themes, each 11 files: table.png, preview images, action buttons and pucks as SVG, one *tablestyle.xml). Folders 1.5M to 5.7M. Older GUI tables: data/gfx/gui/table/ (5 folders).
- Sounds: data/sounds/default/ (14 WAV, 2.7M in total with extras). Copies in src/gui/qt6-qml/resources/sounds/ (28 WAV/OGG across tree).
- Avatars: data/gfx/avatars/default/ (misc and people folders). 13 historical portraits listed by Commons URL.
- UI art: src/gui/qt6-qml/resources/ (many icon SVG, hands/, emotes/, cflags/; counts not taken).
- Text: data/translations/ (about 90 compiled .qm files, 5.5M). No quest, lore or item-name text files seen in the data pack listing (only .qm translations and style XML); not searched deeper.
- Previews: preview/ and README screenshots (not counted).

## 3. Rights-holder status (from repo files only)
Mixed. PokerTH project (own work, for some items); third-party sources with URLs (KDE, kde-look, Wikimedia Commons, icons8, a GitHub fork of a playing-card deck); donated items; AI-generated items (ChatGPT, vectorise.ai) with no rights statement; one group marked "inspired by Terry Pratchett's Discworld" (data-copyright.txt line 93). No clean-room, original-game-data or leak statement. Unknown for most art and all sounds.

## 4. Best class (per group)
- Fonts with OFL: A (licence text kept with font).
- LGPL card decks (default, default4c, cards-simple, blacklight geometry): B (LGPL/GPL conditions).
- Discworld cards and backs, Pratchett-motif art: C (AI-generated, named IP motif).
- Lemming cards (rebuild of another author's deck, no licence line): C.
- Table PNGs: C (ChatGPT per file; no entry for 12 themes).
- Sounds: C (KDE URLs with no licence line; donor-supplied).
- Avatars: C (Commons URLs, no licence line).
- Overall best class: C, with A and B only for the named groups.

## 5. Inspiration notes (own words)
- Table art as one raster per theme, centred by a crop; the theme XML states felt edges in pixels and says only the crop shifts the table against the card row (data/gfx/qml/table/disco/discotablestyle.xml, header comment). Transferable as: crop the arena backdrop so its centre matches the action focal point.
- Action buttons keep one shape per action and change material: pirates uses four wood tones with knots, rivets and edge light (data/gfx/qml/table/pirates/piratestablestyle.xml line 16 onward); disco uses neon tiles (disco line 22).
- Small-size card rule: below 75 px the card shows one large rank glyph and one suit (data-copyright.txt lines 69-71). Relevant to a 375 wide HUD.
- Token state by material and size: small blind pale and worn, big blind rich gold, dealer a cast-iron ball with a fuse in the free corner (piratestablestyle.xml line 22 onward).
- Faceted glow sphere from projected grid cells and gradients, because the renderer has no filters (data/gfx/qml/backside/disco/backside.svg header lines 2-4).
- Sound per game event: one short cue per action, a your-turn beep, and three escalating blind-level stingers (data/sounds/default/ names only; audio not opened).
- Skin packs as data: each theme is a folder with art and one XML style file (data/gfx/qml/table/*/ 20 folders).

## 6. Inspiration briefs
Rule for all briefs: recreate as a clearly distinct original, never a copy. Each brief names the trait kept and the trait changed.
1. Plank-tone action bar: keep one button shape, four tones from one material, role-to-tone map; change to stone, iron or bone and add a role icon. Ref: data/gfx/qml/table/pirates/piratestablestyle.xml line 16 onward.
2. Faceted glow ball (gradient-only): keep faceted surface and gradient glow with no filters; change the form to a shard and use a different glow colour. Ref: data/gfx/qml/backside/disco/backside.svg.
3. Mini-glyph at small size: keep the size threshold and the one-glyph-plus-one-symbol reduction; change to our own threat icons and a 375 wide threshold. Ref: data-copyright.txt lines 69-71.
4. Fuse-token marker: keep the off-centre accent that does not shrink the body; change to an ember or rune-stone marker with no fuse. Ref: piratestablestyle.xml line 22 onward.
5. Escalating level stinger: keep one motif in three steps tied to a rising clock; change the motif and instrument and tie it to wave tier. Ref: data/sounds/default/blinds_raises_level1.wav to level3 (names only, not opened).

## 7. Cross-link to our cell topics
- hud-ui: small-size glyph rule and button material (sections 5 and 6, items 1 and 3).
- sound-music: per-action cues and escalating stingers (item 5); sounds are C, so ideas only.
- loot: token material and size as state (item 4) fits a loot or rarity marker.
- vfx: gradient-only glow (item 2).

## Not read
See the not_read list in pokerth-pokerth.assets.json: src/ engine and server code, audio content, pixel content of art, data/gfx/gui, translations, preview images, generator scripts, docs, and most style XML files other than four.
