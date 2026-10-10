# wesnoth-wesnoth (asset audit, AU057)

Donor: /mnt/frankendom-donors/wesnoth-wesnoth/ (Battle for Wesnoth: C++ engine in src/, WML data in data/, fonts, sounds, images, docs)
Halves read: DATA pack (data/core units, team colours, copyright registry) and a CLIENT/engine slice (src/attack_prediction.cpp, header constant). Server half: present (src/server), NOT read. Paired halves: the box has both data and server; no other donor is paired.
Code licence: GPL v2 or later (COPYING lines 1-2; README line 82).
Asset licence: mixed. copyrights.csv (396 rows read by tally): 343 GPL v2+, 48 CC BY-SA 4.0, 5 CC0. Unit and terrain art has no registry rows.
Rights-holder status: community project. Copyright header in the 'copyright' file names David White for 2003-2018. Registry lists per-file authors (names not copied here).
Best class: B (copyleft and share-alike rows; 5 CC0 rows are class A per file; unit art is class C because its per-file licence is not stated).

## 1. Licence files
- COPYING: GPL v2 text.
- README.md line 82: source GPL v2+; most art and music GPL v2+; new contributions CC BY-SA 4.0.
- copyrights.csv: the per-file registry (columns: date, file, licence, author, notes, MD5). Tally by licence: GPL v2+ 343, CC BY-SA 4.0 48, CC0 5 (of 396 rows).
- fonts/COPYING: Andagii (GPL with font exception, line 13), Lohit-Bengali (SIL OFL 1.1, line 26), DejaVu Sans section (line 117). Other fonts: no section read.

## 2. Asset inventory (counts from find and wc; not opened)
- data/core/images: 14,071 PNG; data/core/images/units: 7,175 files.
- data/core/sounds: 272 files. data/core/music: 44 files.
- data/campaigns/*: sounds and music in each campaign folder (registry rows by folder: CC BY-SA 4.0 for most campaign sound and music rows).
- data/core/units: 327 .cfg unit files; drakes/ has 17 drake unit files (Arbiter, Armageddon, Blademaster, Burner, Clasher, Enforcer, Fighter, Fire, Flameheart, Flare, Glider, Hurricane, Inferno, Sky, Thrasher, Warden, Warrior - names as file names only).
- fonts/: about 40 files (TTF/OTF), 28 MB.
- doc/: 11 MB (not read). po/: 38 entries (locale folders and templates).
- Maps and levels: campaign folders under data/campaigns (not counted).

## 3. Rights-holder status
Community open-source project. Copyright in source headers; per-file authorship in the registry. No third-party commercial game data in the box (no original-game asset is stated).

## 4. Data first: where the creature look lives
- data/core/units/drakes/Burner.cfg is the data record: id (line 3), base image (line 7), death sound (line 19), attack records (lines 27-40, claws melee with an icon and a strike count; fire breath as a ranged record), melee strip (line 59).
- data/core/team-colors.cfg: four values per colour range (average, highlight, shadow, minimap marker); the file header explains the order (line 4).
- The English strings sit in the cfg files as _ "..." macros (for example line 4 of Burner.cfg). po/ holds the translation sets (38 entries, not read).

## 5. Inspiration (category level for class B art; mechanisms from GPL code are shape-only)
- A creature as a list of attack records, each with its own icon, damage, strike count and range (Burner.cfg 27-40). Idea: a creature's attacks are data, not code.
- Strike clip as a frame range with a per-frame time (Burner.cfg 59).
- Team colour as four values from one ramp (team-colors.cfg line 4 onward).
- Attack preview as an exact per-round table with a sampled fallback (src/attack_prediction.cpp 1853-1870, 2366-2380; hpp line 63; 5000-iteration sampler at cpp 1408). Shape only: GPL.
- Debuff probability math with clamps (calculate_probability_of_debuff, cpp 1755-1770).
- Per-creature death sound as a file reference on the unit record (Burner.cfg line 19).

## 6. Briefs (4)
Dom's rule: recreate as a clearly distinct original, never a copy.
1. Two-attack fire drake (Burner.cfg 27-40, 59): kept two attack records, six-frame strike strip, per-creature death sound; changed to a wingless crested quadruped with a glowing spine and an ember cone.
2. Odds card (attack_prediction.cpp 1853-1870, 2366-2380): kept exact per-round odds for small fights and a sampled estimate for big ones; changed to a three-stop bar and no slow plane.
3. Faction ramp (team-colors.cfg 1-20): kept four values per faction and a palette swap; changed to a gold seam and a fifth glow-rim value.
4. Striking frame strip (Burner.cfg 59): kept one range per strike; changed to a wind-up, hit, recover curve with hitstop on the hit frame.

No zone, loot or spawn brief: the zone and campaign files were not read.

## 7. Cross-link
- hud-ui: the odds-card idea (section 6 brief 2). Minimap and touch UX not read.
- vfx and animation: frame-range clip syntax (Burner.cfg 59). Effects not read.
- sound-music: layered campaign music and sound rows with CC BY-SA. Layering and biome beds not read.
- loot, spawns, zones: data layout only (data/campaigns). Not read.

## 8. Not read
Server half (src/server), most of src/, the audio and images themselves, fonts beyond COPYING headers, DejaVu licence text in full, po/, doc/, the rest of the registry rows, other unit races.
