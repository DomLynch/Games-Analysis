# simutrans-simutrans (design catalogue, cell DC050)

Donor: /mnt/frankendom-donors/simutrans-simutrans (VPS). Simutrans, an open-source transport simulator. This tree is the SOURCE distribution plus a data and UI folder. It has no creatures, classes, weapons or armour. The useful content here is the simulation mechanisms (ambient walkers, climate bands, day-night curve, playlist, string table).
Class: code under the Artistic License 1.0 (LICENSE.txt line 36 "The Artistic License"); assets mixed (see Licence). Shape only: no code, music, font or skin copied.
Half read: DATA and UI half (simutrans/ folder: text, music listing, fonts, theme source, scripts names) plus targeted reads of the code half (climate, pedestrians, sound, day-night, settings). Read in parts, not whole files. The paired GRAPHICS half (paksets: vehicles, buildings, tiles, walker images) is NOT in the box; README.md line 182 says the paksets "have their own license, but no one is included alongside this code". No other half exists in the box.
Receipts: /private/tmp/p2/wave2-haiku/batch3/DC050/receipts.tsv (verified).

## Counts (verified in the source read)
- creatures: 0. Ambient walkers exist (section 1) but are not creatures, and their types come from paksets that are absent.
- classes: 0.
- weapons: 0.
- gear_sets: 0.
- zones: 8 climate types (water, desert, tropic, mediterranean, temperate, tundra, rocky, arctic). Source: /mnt/frankendom-donors/simutrans-simutrans/src/simutrans/simtypes.h lines 55-66.

## 1. Creatures and beasts
None. top_creatures is empty; no creature family exists in the box. The closest thing is the ambient walker (pedestrian) system, which is a population mechanism rather than a monster family. It is in section 6 and the originals.

## 2. Classes, races and factions
None. There are no classes, races or factions in the code or data read. Scenario scripts exist (simutrans/script, 24 .nut files; scenario_base.nut and script_base.nut by name) but their contents were not read, so no mission archetype is claimed.

## 3. Weapons
None.

## 4. Armour and gear
None. The item-like content is goods and freight, not gear.

## 5. Zones, climates and placement
- Eight climate types (simtypes.h lines 55-66). Each is a bit, so a placement can allow a set of climates (simtypes.h lines 68-80).
- Climate is set by height bands. Defaults are in settings.cc lines 100-115, with a generator set to HEIGHT_BASED (line 102). The band numbers are donor data; not copied here.
- Fallback for a height that no band claims (surface.cc lines 618-629, read): sea-level height gets desert, heights above the top arctic band get arctic, anything else gets temperate.
- Defect (comment versus code). surface.cc line 606 says "the later climates will win"; the code at lines 611-612 keeps the first climate that claims a height, because it writes only when the count is zero. The code is what runs. Fix: pick one rule and state it in the band data.
- Placement: square_is_free (surface.cc lines 82-113, partly read) checks each square's climate against an allowed-climate mask. For the water bit it also accepts a square that has water next to it (lines 101-109, partly read). That is a shore rule.
- Hazards: none read.

Top 5 zones (striking, category level):
1. Height-band climates with a fallback. keep: climate bands as an ordered data table, with a fallback for gaps. change: one explicit precedence rule written in the data; our fallback is temperate, not desert. ref: /mnt/frankendom-donors/simutrans-simutrans/src/simutrans/world/surface.cc (lines 599-629)
2. Shore placement rule. keep: a tile is valid for a shore zone when water is next to it. change: our own coastal shrines and ports on our zone data. ref: /mnt/frankendom-donors/simutrans-simutrans/src/simutrans/world/surface.cc (lines 101-109, partly read)
3. Climate allow-mask. keep: each placement names the climates it allows as bits. change: zone masks in zone data for our biomes. ref: /mnt/frankendom-donors/simutrans-simutrans/src/simutrans/simtypes.h (lines 68-80)
4. Water band at the bottom of the scale. keep: a water band at the lowest height. change: our own lake and marsh bands, not a single sea level. ref: /mnt/frankendom-donors/simutrans-simutrans/src/simutrans/dataobj/settings.cc (lines 104-110)
5. Arctic band as the open top. keep: the top band is open-ended. change: our own high-altitude zone with a clear name. ref: /mnt/frankendom-donors/simutrans-simutrans/src/simutrans/world/surface.cc (lines 618-629)

## 6. Ambient life (walk density) and spawns
This is the most useful mechanism in this donor. All of it was read in the source.
- Walker count per event. Walkers are created when passengers arrive at a stop. Passenger count is (level + 6) >> 2 and mail count is (mail level + 8) >> 3 (simcity.cc lines 1861-1868). Walkers are created only when the random-pedestrian setting is on.
- Spawn cap per call. At most 4 walkers are created on one tile per call (pedestrian.cc line 202). Spawn stops on a tile that already holds 120 objects (line 204).
- Spread to neighbours. The spawn runs on the tile and then on its four neighbours while the budget lasts (pedestrian.cc lines 229-236).
- Separation offset. Each new walker is moved along by an amount tied to the object count on the tile (line 212: separate_pedestrians = (bd->obj_count()*23)). A simple, deterministic way to keep a crowd from stacking.
- Lifetime. Each walker gets a random lifetime from a route table at creation (line 117). When the lifetime ends, it is removed (line 221 for failed placement; sync_step removes at zero, read).
- Despawn on empty. A walker is removed when the road under it is gone (hop_check, pedestrian.cc lines 254-272), and also when its target tile holds 240 objects (line 270).
- Type by weight. A walker type is picked by a distribution weight from its descriptor (pedestrian.cc line 112; pedestrian_desc.h line 27). Types are filtered by intro and retire months when the timeline is on (pedestrian.cc around lines 80-95, partly read).
- Animation by data. A walker has an animated frame list when steps_per_frame is above zero, otherwise a static image per direction (pedestrian_desc.h lines 28 and 32-41).
- Lane side. Walkers pick a random side of the road at creation (pedestrian.cc line 115).
- Walk density measured: not measured (no run). Numbers above are from code only.

Fit to Frankendom: this is row 23 (zone population: spawn caps, respawn, despawn on empty with a grace timer). The donor has caps per tile, a per-event budget, a lifetime and a despawn on empty, but no grace timer read.

## 7. Looks, lighting and UI
- Day-night curve. A 48-slot table (simview.cc line 37 onward; first two rows read) gives a darkness level per half-hour slot. The slot is computed from the in-game month ticks (line 425), then added to a user offset (line 427). Full underground mode forces level 0 (line 409). Fit: a lighting curve as data with an offset.
- Light colours. The renderer has a day light and a night light colour per light (simgraph0 declaration only; body not read).
- Skin sets. Each theme ships a large-type twin with the same element names (audit AU049; themes.src and simutrans/themes folders). Refs: /mnt/frankendom-donors/simutrans-simutrans/simutrans/themes/high-contrast-large.tab and themes.src/highcontrast-large.
- Scaling marker. A leading marker on an image name decides whether that panel stretches (audit AU049, standard.dat header; not re-read here).
- Font per language. The language table names the font key (en.tab line 3 "Prop-Latin1.bdf").
- No glow, metal, gold or crystal look is present in this box. The paksets that would carry them are absent.

## 8. Sound and music
- Playlist, not state-driven. 55 MIDI files (simutrans/music). check_midi (simsound.cc lines 402-431, read) advances when a track ends: a random track when shuffle is on, otherwise the next index with wrap-around. Starts use shuffle or index 0 (simmain.cc line 1460; simsound.cc line 318; gui/loadsoundfont_frame.cc line 35). Unmute and advance replay the current track (simsound.cc lines 381, 425). No game state chooses the track in the code read.
- Shuffle without repeat. The shuffle picks a random index, then moves past the current one (simsound.cc lines 408-409). The comment says the game random generator must not be used (line 408).
- Sound effects: none in the tree (0 .wav, 0 .ogg, 0 .mp3 files; audit AU049).
- Sound toggles. The string table has six keys ending in _SOUND (four read: ambient, cash, crossing warnings, factory noises). These are player toggles per sound category, not sound cues.
- Track titles (names only, content not played): main theme, B theme, boring afternoon, busy day at the depot, transport chaos, stucked convoy. Shape only.

## 9. String table grammar (en.tab)
- 1687 lines. Lines 1-3 are a header: language name, a font key line, and the font file name. A block of # comments follows (36 comment lines in total), then the entries.
- Entries are pairs: a key line, then the English text line. 824 pairs by line count (lines 4 onward, excluding comments). About 336 keys are identifier-style (letters and underscores). The rest are English phrases used as their own keys. Strict alternation was checked by count, not line by line.
- Quotes: none (grammar only).
- 62 other language files (simutrans/text, 63 entries in total).

## Licence (what the files say)
- Code: Artistic License 1.0 (LICENSE.txt line 36; build_themes.sh header). Not on the brief's adapt list, so shape only.
- Assets conflict: simutrans/license.txt says the Artistic licence covers the images, data, midi and fonts in the source distribution; simutrans/copyright.txt line 6 says "Simutrans may not be sold or modified in any way without" written permission. Treated as class C (conflict). No music, font or skin is reused.
- One clear asset licence: themes.src/pak192comic/pak192comic.tab line 4 "These are under CC-BY-SA 3.0!" (class B). Used as inspiration only; its art is not reused.
- Scripts: squirrel library licence text in simutrans/license_squirrel.txt (line 1 copyright, then MIT-style text). Code, not used.
- Paksets: absent from the box.

## Inspiration for Frankendom (originals, clearly distinct)
1. Ambient walker crowd (row 23). idea: a passenger-like event spawns a small crowd of walkers near the event, with a per-event budget, a per-tile cap, a lifetime and a despawn when the road is gone. keep: budget per event, 4 per tile per call, a cap on objects per tile, random lifetime, despawn on empty. change: spawn events from our town and loot events; budget and lifetime as zone data in seconds; a grace timer before despawn (missing in the donor).
2. Biome by height band with explicit precedence. idea: zone biome is set by height bands in data, with a stated fallback. keep: ordered bands and a fallback. change: state the precedence in the data (first or last wins, never both); our fallback is temperate.
3. Shore placement rule. idea: a coastal feature (shrine, port) is valid only next to water. keep: a neighbour test for water. change: our own coastal rule for our zone features.
4. Night clock table. idea: darkness is a 48-slot table over the day, plus a user offset, forced dark underground. keep: the table, the offset, and forced dark underground. change: a per-zone curve and an ember glow for our night.
5. Playlist shuffle without repeat. idea: random track that never repeats the one just played, with sequential fallback. keep: exclude the current track. change: biome-keyed ambience beds with a crossfade at borders, not a melody.
6. Large-type twin skin. idea: every UI skin has a large twin with the same element names. keep: same names in the large set, one layout. change: our own palette and a touch-size rule instead of a fixed scale.
7. Animated or static by step count. idea: a walker is animated only when its descriptor sets a step count. keep: one data field decides animation. change: our own idle loops for NPCs (creature idle vocabulary).
8. Per-category sound toggles. idea: the player turns each sound category on or off. keep: per-category toggles. change: our categories (footsteps, hit impacts, ambience, stingers).

## Not read
- Paksets (absent). Walker images and vehicle graphics.
- The 55 .mid files (titles only; content not played).
- The .bdf fonts (names only). The .png skin parts and compiled .pak files (names only).
- The 24 .nut scripts (names only; contents not read).
- en.tab beyond the header and the entry-shape check; the other 62 language files.
- documentation/ folder (not opened).
- C++ code: only the cited functions were read. Not read: sound backends, display code except simview.cc, the script API, the rest of the world code.
- simgraph0 light colour bodies (declaration only).
- Walker lifetime table (strecke) contents.
