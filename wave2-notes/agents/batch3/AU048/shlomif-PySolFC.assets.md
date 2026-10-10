# shlomif-PySolFC (asset audit, cell AU048)

Donor: shlomif-PySolFC (/mnt/frankendom-donors/shlomif-PySolFC). Read-only, VPS only.
Donor AGENTS.md and other notes: none at root beyond README/docs; nothing treated as instructions.

## 1. Licences (as the files say)
- Code: COPYING is GNU GPL version 3 (COPYING:1). html-src/license.html is the GPL3 text.
- Some changes by one maintainer are under the Expat licence (html-src/credits.html:8: "he places all his changes under the Expat license").
- README.md has no licence section (grep for licen/GPL: no match).
- Non-code licences are per folder, stated in info/credit files:
  - data/tiles/COPYRIGHT:1 says five tiles are CC0 (Leaf, Mountains, Night Forest, Pink Hearts, Vortex; COPYRIGHT:2-6).
  - data/tiles/COPYRIGHT:8 says four tiles (Cosmos, Dark Forest, Purple Mosaic, Stone Wall; lines 9-12) may be re-used in other projects but "cannot be sold commercially as-is" unless edited or part of a larger project.
  - Other tiles in data/tiles are not listed in COPYRIGHT (unstated).
  - data/images/stats/imagecredit.txt:2 one progression image CC0 (publicdomainpictures.net); :4 the old progression image source is unknown.
  - data/images/toolbar: Nuvola set is LGPL 2.1 (nuvola/info.txt:1); Material Design Icons under Apache 2.0 (material/COPYING:2); "Human" icon set under CC-BY-SA (human/info.txt:3, some icons modified); Crystal icons, README.ICONS:1 names the set and author, no licence line.
  - Sound effects (data/sound/*.wav): no licence file in the folder; credits.html:27 credits "Music" to one person, not the effects. Unstated.
  - Themes: data/themes/blue/blue8.4.tcl:1 is a Tcl theme with a copyright line; no licence line read (only line 1). Unstated.
- Card faces: NOT in the repo. README.md:101 and README.md:212-215: cardsets are a separate download from SourceForge. Their licence is not in the box.
- Music: NOT in the repo. README.md:206-210: original PySol music is downloaded separately.

## 2. Rights-holder status (repo files only)
- AUTHORS.md and credits.html: a continued fan/maintainer project descended from PySol (Oberhumer, "Author of PySol"; credits.html lists authors and contributors). Asset credits: Material Design Icons, Trueno font under OFL (logo, credits.html), a logo by a named contributor.
- No clean-room statement. Status: open-source maintenance of a free game; most art is third-party with its own licence lines; card faces and music are separate downloads (licence not in the box).

## 3. Asset inventory (in the repo)
| kind | path | count | licence | class | note |
|---|---|---|---|---|---|
| card back art | data/images/cards/bottoms/<set>/ | 11 sets (e.g. french, hanafuda, ishido, hex-a-deck, dashavatara-ganjifa); french bottom02-n.png is 162x160 px | unstated (no per-folder licence in box) | C | card backs; sizes read on one file |
| finder/card marker art | data/images/cards/finder/<set>/ | 9 sets | unstated | C | per-suit/rank small icons (names only) |
| toolbar icons | data/images/toolbar/ | 397 files | mixed (LGPL 2.1, Apache 2.0, CC-BY-SA, unstated) | B for LGPL/Apache/CC-BY-SA groups; C for crystal and unstated | includes light/ subfolder for dark UI (material/info.txt:3 region) |
| table tiles | data/tiles/ | 53 files incl. subfolders stretch/ and save-aspect/ | 5 CC0; 4 non-commercial-as-is; rest unstated | A (5 CC0); B (4 conditional); C (rest) | 200x200 px sample (Abstract_Metallic.png) |
| progression image | data/images/stats/imagecredit.txt | 1 image + credit file | CC0 for the new image; old image unknown | A (new); C (old) | |
| sound effects | data/sound/*.wav, data/sound/extra/grandfathersclock.wav | 29 files | unstated | C | UI and game-state cues (see section 6) |
| themes | data/themes/blue, data/themes/clearlooks | 120 files | unstated; blue.tcl copyright line only | C | Tcl/Tk theme code and assets |
| UI images | data/images/{buttons 36, tree 24, dialog 20, demo 15, pause 13, redealicons 8, logos 6, icons 5, htmlviewer 1} + single PNGs | about 130 | unstated; logo has a credited designer and an OFL font (credits.html) | C | not read beyond names |
| translations | po/*.po (14 files; de_games.po has 1849 msgids), locale/ (6 languages) | 14 po | unstated | C | string tables (data first) |
| cardsets and music | not in repo | 0 | separate download (README.md:101, :209) | D | absent from box |
| code (game logic) | pysollib/ (about 42 py files), pysollib/games/ (80 files) | ~120 | GPL3 (COPYING:1); some Expat per credits.html:8 | B (code, not assets) | game logic; read only the sound/win path |

Overall: best class A (only for CC0 tiles and one CC0 image); most non-code content is C; the rest B or D. Shape for us, not copies.

## 4. Data first
- String/translation tables: po/games.pot and po/*_games.po (game names and rules text) and po/*_pysol.po (UI strings). de_games.po has 1849 msgid entries (grep count). Half read: data tables, not the game code. Names, not text, are recorded here.
- Game registry: pysollib/games/ holds one module per game (80 files); pysollib/gamedb.py is the registry (named, not read).
- Sound cue table: data/sound/*.wav plus pysollib/options.py:155-175 and 471-474 (boolean switch per cue name). The cue names are the data.
- Halves: game logic (pysollib/game/__init__.py) read in part (win path); art and sound data read by listing and credit files only. Card-face half (cardsets) not in box.

## 5. Which half was read
- Code half: partly read (win/lose sound path, audio dispatch). Not a full game read.
- Data half: listed and credited (art, sound, tiles, themes, po tables). No file contents read beyond credits, licence and header lines and one PNG size.
- Cardsets and music half: not in box. Never write "absent" as a finding about the code; here it is simply not in the repo.

## 6. Inspiration (category level; class A/B/C mix; no copies)
- Outcome stinger ladder: four end states, each with its own sample and dialog: perfect, won, finished, lost (pysollib/game/__init__.py:2476, 2492, 2506, 2512). Shape for sound-music stingers and the progression end-screen.
- Priority-gated sound: a stinger uses a high priority; a looping sample blocks lower-priority cues (pysollib/pysolaudio.py:94). Shape for ambience-vs-stinger mixing.
- Loss note that names the help used: the lost-game message is "Game finished, but not without my help..." (pysollib/game/__init__.py:2513), and the dialog counts hints used. Shape for making a loss bearable without a penalty screen.
- Reject cue: a short "nomove" sample for an illegal action (data/sound/nomove.wav). Shape for combat input feedback (row 5).
- Card back families: many back-art sets per theme (data/images/cards/bottoms, 11 sets). Shape for cosmetic variety with one shape language.
- Light and dark icon sets in one folder (data/images/toolbar/material/info.txt:3). Shape for dark-UI legibility (hud-ui).
- Accessible output and speech: the optional Accessible Output 2 dependency (README.md:44). Named only. Relevant to hud-ui accessibility.
- Tile themes: CC0 tiles for table backgrounds. Shape for zone background variety.

## 7. Inspiration briefs
1. label "perfect flourish" (effect). why: a rare top-tier end state with its own stinger, animation and dialog. keep: a separate top stinger, a flourish, a dialog that states the cost (moves, time). change: ours tie to a clean run (no death in the zone) and our own sound. ref: pysollib/game/__init__.py:2476
2. label "reject tick" (effect/sound). why: a very short cue that says "no" without a dialog. keep: short, dry, distinct from success. change: our own sound and a tiny screen shake instead of a dialog. ref: data/sound/nomove.wav
3. label "lost with a note" (effect). why: a loss that lists what helped instead of only the failure. keep: the loss line names the aids used. change: ours names the player's own choices and a next step, not a score. ref: pysollib/game/__init__.py:2513
4. label "back-art families" (item). why: one card back shape with many art sets. keep: several art families sharing one silhouette and one frame. change: our palette, ornament and frame, not the donor's sets. ref: data/images/cards/bottoms/french/
5. label "dark-ui icon pair" (item). why: each UI icon has a light and a dark variant in one folder. keep: a light/dark pair per icon, same shape. change: our icon style and our stroke weight. ref: data/images/toolbar/material/info.txt:3

Rule: recreate each as a clearly distinct original, never a copy. Kept: the mechanism (tiered stinger, reject cue, loss note, art families, light/dark pairs). Changed: sound, art, text, palette.

## 8. Cross-link
- sound-music: stinger ladder and priority gating (pysollib/game/__init__.py:2476-2512; pysolaudio.py:94).
- combat cues: reject tick (data/sound/nomove.wav) for row 5 input feedback.
- death and respawn: loss note (game/__init__.py:2513) for row 17 presentation.
- hud-ui: light/dark icons (toolbar); accessibility via speech (README.md:44).
- loot/cosmetics: back-art families (cards/bottoms) as cosmetic collections.
- zones/camera: tiles as background themes; no zone data here.

## Not read / unverified
- Cardsets (card faces) and music: not in repo.
- The 29 wav files: names and folder only, not played or inspected.
- Sound effect licence: no licence file found in data/sound (listing only).
- Themes (120 files): only the blue.tcl copyright line read.
- Most of data/images (about 1,300 files): folder counts only.
- pysollib/game/__init__.py beyond lines 2466-2520 and pysolaudio.py beyond lines 90-94: not read.
- po tables: counts only, no text read.
- Logo font: credited in credits.html; font file not in box (not checked).
