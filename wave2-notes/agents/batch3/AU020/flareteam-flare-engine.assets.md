# Asset audit: flareteam-flare-engine (AU020)

Donor tree: /mnt/frankendom-donors/flareteam-flare-engine (read-only, VPS). This is the engine repo; the game art is in the separate flare-game donor.

## Licence (what the files say)
- Code: GNU GPL v3. COPYING is the GPL v3 text (COPYING:2). README.engine.md: "Flare's source code is released under the GNU GPL v3." (README.engine.md:33). Later versions permitted.
- Copyright: README.engine.md says "Contributors retain copyrights to their original contributions." (README.engine.md:31).
- Default mod (art, text, translations): "is released under GNU GPL v3 and CC-BY-SA 3.0." (README.engine.md:35). The file does not say which files get which licence. Dual statement, so class B with a caveat (treat as C if a strict reading is needed).
- Liberation Sans: SIL OFL 1.1 (README.engine.md:38). GNU Unifont: GPL v2 with a font-embedding exception (README.engine.md).
- AI policy: AI_POLICY.md says "No AI-generated media is allowed (art, images, videos, audio, etc.)." (AI_POLICY.md:45). This governs contributions to the Flare project, so it matters to us if we ever contribute upstream.

## Rights-holder status
Community open-source project. Copyright line names Clint Bellanger for most of the code (2010-2013). Not a commercial game. Art credits name individuals and "the community at OpenGameArt" (mods/default/cutscenes/credits_engine.txt:157).

## Asset inventory
- mods/default/images/menus/ and buttons/: about 28 png in mods/default/images. UI kit: nine-slice button, listbox, slider, scrollbar, checkbox, tab active and inactive, compass ortho and iso, movement type icons, dev console frame. PNG header sizes: button_default 142x112, slider_default 209x72, listbox_default 145x84, tab_active 128x32, compass_iso 24x24, dev_console 640x176.
- mods/default/images/logo and credits: 4 png, including third-party style badges (oga.png, tiled.png). Not licensed in the repo.
- mods/default/fonts: LiberationSans-Regular.ttf, unifont-10.0.06.ttf.
- mods/default/languages: 64 .po translation files in the repo.
- mods/default/cutscenes, menus, engine: text definitions (stats, damage types, combat text, font colour table, intro and credits).
- Audio: none in this repo. A check for .ogg, .wav and .mp3 found zero.

## Class by group
- UI kit art: B (dual GPL3 / CC-BY-SA statement, no per-file split; C if strict).
- Badges and logos: C.
- Fonts: B (SIL OFL 1.1 and GPL v2 with exception; keep the licence notices).
- Translations and config text: B (same dual statement as the UI kit).
- Audio: D here (not in this repo; see the flare-game file).
- Best class for the donor: B, with the caveat above.

## Inspiration (own words)
- Nine-slice UI kit: small fixed-size pieces (button, listbox, slider, scrollbar, checkbox, tab) that stretch to fit any label. Recreate with our own corner ornament and bevel.
- Active and inactive tab pair: two small images per tab so the selected state is one piece swapped. A cheap clear pattern for our menu tabs.
- Damage colour language: combat text and the font colour table are plain text, so each damage type keeps one colour across all floating numbers. Copy the idea with our own palette.
- Two compass projections: one for orthogonal maps, one for isometric maps. For our camera, a marker that matches the projection.
- Text-driven menus and cutscenes: layout and timing live in text definitions, not code. Worth copying for our menu and cutscene data.

## Briefs
1. Nine-slice button frame. Why: one stretching frame keeps every button consistent. Keep: fixed corners; a bright bevel on top; one label plate. Change: our own corner ornament; angular corners; a faction palette. Ref: mods/default/images/menus/buttons/button_default.png (not viewed).
2. Two-projection compass. Why: a direction marker that matches the camera reads at a glance. Keep: one arrow per projection; a tinted neutral dial; fixed small size. Change: a marker tied to our camera angle; an in-world object; our own palette. Ref: mods/default/images/menus/compass_ortho.png and compass_iso.png (not viewed).
3. Damage-coloured floating numbers. Why: one colour per damage type lets a player read a fight. Keep: one colour per type; a short float-up; one colour table. Change: our own damage types; outline style; size for crits. Ref: mods/default/engine/combat_text.txt and mods/default/engine/font_colors.txt.

## Cross-link to our cell topics
- hud-ui: strongest link. The nine-slice kit, tabs and compass are directly relevant.
- vfx: combat text colours only (no effect sprites in this repo).
- sound, camera, zones, spawns, loot, animation: no assets here beyond what the flare-game donor holds.

## Not read
- Visual content of any PNG (sizes from headers only, nothing viewed by eye).
- The .po translation contents (structure only).
- mods/gcw0_defaults settings.
- Android and iOS project folders.
- src/ code (not assets).
