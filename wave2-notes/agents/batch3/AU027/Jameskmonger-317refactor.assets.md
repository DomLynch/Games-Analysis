# Jameskmonger-317refactor (asset audit, AU027) - RESTRICTED

Donor: Jameskmonger-317refactor (Java educational refactor of a Jagex RuneScape client revision 317). Tree: /mnt/frankendom-donors/Jameskmonger-317refactor/ (93 files: 75 .java under src/com/jagex/runescape, 1 doc, IDE and run files, one compiled out/ class file). Restricted: root file _RESTRICTED-NOTE.txt says study shape and idea only, never copy code or constants. Everything below is category-level; no coordinates, constants, colour codes or verbatim code are given here.

Code licence: the LICENSE file is MIT (MIT License line 1, copyright 2014 Jameskmonger line 3). The README says the project is developed from the revision 317 client, which is the intellectual property of Jagex Ltd (README line 8), and says it may be a criminal offence to run it (README line 12). The two statements conflict. Per the rule for unclear licences: class C.

Asset licence: none shipped. The tree has no sprites, models, audio, maps, fonts or cache archives. The client fetches its data archives from the host it was served by (src/com/jagex/runescape/sign/signlink.java line 272 opens a URL from the applet codebase). That data pack is NOT in the box. Class C for anything derived from it.

Rights-holder status: Jagex Ltd named in the README as owner of the revision 317 client (README line 8). Repo says it is an educational refactor (README line 4). Status: restricted; Jagex-derived; Jagex IP per the README. No more than that is stated.

Halves read: client half (src/com/jagex/runescape). Server half: not in the box (the client connects to a server that is not present). Data pack: not in the box; the cache loader code was read by name only (sign/signlink.java, FileCache, Archive, OnDemandFetcher). Paired donor in the box: none.

best_class: D for shipped game content (none). Everything derived (docs/tile_rendering.md, the audio synth, the flame palette code, the tile blend) is class C: inspiration only.

## Data first
- Item and object definitions: src/com/jagex/runescape/definition/ (10 files: item, game object, entity, animation sequence, spot animation, identity kit, floor, font, varp and varbit). Each one reads its fields from a binary cache stream via a readValues routine (definition/ItemDefinition.java line 433). The values live in the cache, not in the code. Class C.
- Chat word filter: Censor.java holds a whitelist table and substitution tables as code (line 18 identifier). Text data, class C. Not quoted.
- Procedural sound data: audio/Instrument.java and Envelope.java decode per-instrument envelopes and filter settings from the cache (Instrument line 36-54). No sample file exists. Class C.
- Tile and region data: scene/tile/PlainTile.java (four corner colours and a texture index) and ShapedTile.java (shape, rotation, overlays) are per-tile records; Region.java keeps blended hue, saturation and lightness arrays for the ground (line 397-405).

## Inventory (what is in the box)
- Java source: 75 files. Code, class C (derived).
- Doc: docs/tile_rendering.md, one file: a step-by-step note of how the world tile renderer works. Class C (derived prose).
- Restricted note and README: text. Class A/B for the note's own text; not game content.
- Compiled out/ class metadata: one binary file, not opened.
- Sound, music, sprites, models, maps: none in the box.

## Inspiration (category-level only)
- Title-screen flame curtain: a fixed palette indexed by heat, with the whole palette cross-fading between three hue families on random triggers (screen/title/FlameColours.java lines 67-124). Keep: heat-indexed palette plus occasional palette cross-fade. Change: a zone-tinted ember ramp, timers in seconds, not per frame. Defect: the timers count per frame, so the animation speed depends on frame rate (fix: drive the timers by delta time).
- Procedural instrument: an instrument is a set of envelopes (pitch, volume, vibrato, gate attack and release, filter) plus a delay with feedback; sound is synthesised when played (audio/Instrument.java lines 36-54 and 143). Keep: instrument as a small parameter set, so sound variety is data. Change: our SFX are oscillator-plus-envelope presets in data for WebAudio, not this format.
- Piecewise envelope: a list of entries, each a level and a ramp time, with a linear ramp between levels and the last level held (audio/Envelope.java lines 54-65). Keep: the list-of-levels shape for attack, hold and decay. Change: float maths. Defect: when a new segment has no time left, the slope from the previous segment is kept (lines 61-63 only set the slope in one branch). Fix: set the slope to zero when the segment is already over; use float or rounded division.
- Corner-blended ground: each plain tile has four corner colours, and blended hue, saturation and lightness arrays smooth the ground across neighbouring tiles; path-like tiles use a shaped record with overlays (scene/tile/PlainTile.java line 14, ShapedTile.java line 38, Region.java line 397, tile doc line 13 and 15). Keep: corner blend and a separate shaped path tile. Change: textured ground with a zone palette shift; paths as decals on the ground.
- Minimap that turns with the camera: the minimap rotates by camera heading plus its own offset, and draws dots per class (NPC, player, friend, team) and a capped list of hint icons (screen/game/Minimap.java lines 72, 283, 288, 456). Keep: rotation with heading, dot classes, hint list. Change: north-up toggle, bigger touch targets, dot colours from our faction set.
- Data-driven definitions: each definition type reads its own fields from a stream (definition/ItemDefinition.java line 433). Keep: one definition class per content kind. Change: JSON rows, not binary cache.
- Whitelist before block: a word filter that checks a whitelist first (Censor.java line 18 identifier). Keep the rule that a whitelist beats a block list for player names. Change: no word list copied; our own list.

## Briefs
Restricted: all briefs are category-level. Rule for all briefs: recreate as a clearly distinct original, never a copy. Top-striking criteria: readable silhouette at 375 wide, one signature behaviour, one signature sound or effect, could be ours at 20-30 percent resemblance.
1. Ember curtain (our own label; category: animated backdrop). Why: a moving heat-palette backdrop costs almost nothing and reads at 375 wide. Keep: heat-indexed palette, occasional cross-fade between palettes. Change: palette per zone, timers in seconds, no text drawn over the flames. Ref: src/com/jagex/runescape/screen/title/FlameColours.java lines 67-124.
2. Path decal (our own label; category: ground overlay). Why: a shaped path reads as a route without a separate model. Keep: corner-blended ground, path shape as an overlay. Change: decal on the ground, not a tile type; path tint from zone data. Ref: docs/tile_rendering.md lines 13-15.
3. Layered synth stinger (our own label; category: reward sound). Why: a short rising chime with vibrato and a short delay is recognisable and cheap. Keep: attack-hold-decay envelope, vibrato, delay feedback. Change: two layers only, our own note set, signature sound per reward tier. Ref: src/com/jagex/runescape/audio/Instrument.java lines 36-54; audio/Envelope.java lines 54-65.
4. Heading minimap (our own label; category: HUD minimap). Why: a minimap that turns with the camera keeps the player oriented in a fight. Keep: rotation with heading, dot classes, capped hint icons. Change: north-up toggle, touch-size targets, markers from zone data. Ref: src/com/jagex/runescape/screen/game/Minimap.java lines 283, 288, 456.

## Cross-link to our topics
- camera: the minimap heading rule (Minimap.java line 283) is a reference for the camera row 11 and HUD row 14.
- sound-music: the envelope and instrument shape is a reference for layered stingers; no sample files exist.
- vfx: the flame palette is a reference for a title or ambience effect (not combat).
- zones/spawns: the tile record and corner blend (PlainTile, Region) are references for zone ground.
- loot: the definition-per-kind loader (ItemDefinition line 433) is a data reference for item catalogue rows.
- chat: whitelist-first filter idea (Censor line 18), not a content source.

## Defects to fix when the idea is kept (per Dom's rule)
- Envelope: zero-length segment keeps the old slope. Fix: set slope to zero when the segment is already over.
- Envelope: integer division for the slope loses precision; the level may not land exactly on the peak. Fix: float or rounded division.
- Flame palette: timers and cross-fade step per frame, so speed depends on frame rate. Fix: timers in seconds, driven by delta time.

## Not read
- The cache archives and the data pack: not in the box.
- Most of the 48 files in the runescape package: listed only (Client.java, Player.java, NPC.java, WorldController.java, Model.java, Rasterizer.java, VertexNormal.java and others not opened).
- out/production class metadata (binary): not opened.
- Censor word lists: identifier only, no content read into this note.
- No CC or licence file other than LICENSE and README was found in the tree.
