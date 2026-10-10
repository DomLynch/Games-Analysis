# orbitersim-orbiter (assets, AU041)

Donor: orbitersim-orbiter (VPS: /mnt/frankendom-donors/orbitersim-orbiter/)
Code licence: MIT for the Orbiter core (LICENSE:3 names Martin Schweiger, 2000-2026; README.md:20). The D3D9Client graphics module is LGPL (README.md:23). XRSound module (Sound/XRSound) is MIT, Copyright 2021 Douglas E. Beachy (Sound/XRSound/LICENSE:3). Other code under Extern/ has its own licence files (Penlight, luafilesystem, imgui fonts; not all read).
Asset licence: mixed and mostly NOT stated. The repo itself does not include most planet textures (README.md:74); the install is separate. Sound clips, textures, meshes, scenarios and gravity models have no per-folder licence line in what I read. Font and icon files have their own licence files (section 2).
Rights-holder status: mixed. Core is an individual author (LICENSE:3). Textures are described as processed from third-party imagery (Landsat-7 and ESA/NASA data, SOL.tex:86 and 111). Gravity models cite PDS (CREDITS.tex:80-83). Voice clips are described as recorded from NASA TV with named crew members (XRSound.cfg:548-550). Unknown for everything else.
Best class: A for the fonts and icon font only (with attribution or licence terms, per their own files). Everything with the real look or sound (textures, sound clips, meshes, scenarios) is C (licence not stated, third-party or real-person source).
Half read: the data and asset half (Sound/, Textures/, Meshes/, Scenarios/, Config/, Doc/, Extern/ licence files). The code half (Src/, OVP/) was NOT read. There is no server half in this repo (single-player client). Paired donor in the box: not checked.

## 1. Licence files (what they say)
- LICENSE:1-3: MIT License, copyright (c) 2000-2026 Martin Schweiger.
- README.md:20: published as an Open Source project under the MIT License.
- README.md:23: D3D9Client graphics engine is licensed under LGPL.
- README.md:72-74: planet texture files are not in the git repo; install them separately (a release or the website hi-res set), set in CMake or Orbiter.cfg (README.md:82-89).
- Sound/XRSound/LICENSE:3: MIT, Copyright 2021 Douglas E. Beachy.
- Doc/Orbiter User Manual/CREDITS.tex:18: "See Sound/XRSound/LICENSE for XRSound license."
- Html/Main/Credit/credit.htm:365: "CC BY 4.0 License" (credit for Font Awesome, with the CC link). Font Awesome Free License title at Extern/imgui/License-FA.txt:5.
- Extern/imgui/Lekton - SIL License.txt:1: SIL Open Font License 1.1.
- Extern/imgui/architext.regular - FFC License.txt:1: 1001Fonts Free For Commercial Use License (FFC) (full terms not read).
- Scenarios/The Solar System/Venus.scn:3: image credit "courtesy Jim BigJimW Williams" (a screenshot credit inside a scenario).
- No LICENSE file in Textures/, Meshes/, Scenarios/ (other than the scenario credit above), GravityModels/, Doc/Scenery or Config/. Checked by find on names only.

## 2. Asset inventory (real paths)
| Group | Path | Count / size | Licence (as the file says) | Class |
|---|---|---|---|---|
| Sound clips (XRSound default set) | Sound/XRSound/assets/XRSound/Default/ | 454 WAV: 301 in Default, 141 in Altea STS (air-to-ground chatter), 12 in Cabin Ambience (amb0-amb12) | MIT for the module (Sound/XRSound/LICENSE:3); clip source: "recorded live from NASA TV" (XRSound.cfg:550) | C (source note and real-person speech, licence for the clips not stated) |
| Sound module assets | Sound/XRSound/assets/ (Doc/ with pdf, docx, eps, psd, jpg, png; plus 15 other non-WAV files: 5 cfg, 1 txt, 1 ogg) | 469 files in the assets folder (454 WAV, 15 others) | MIT (module) | A for module code and config; C for clip set |
| Sound config | Sound/XRSound/assets/XRSound/XRSound.cfg | one config file with [SYSTEM] and per-event sections | MIT (module) | A |
| Planet and sky textures | Textures/ (261 files, 228 MB): dds 169, tex 40, png 33, bmp 16; subfolders Atlantis, KSC, Cockpit, Common, D3D9, samples, generic, csphere (20 files) | 261 files | not stated; planet textures absent from git (README.md:74); manual says processed from third-party imagery (SOL.tex:86, 111) | C |
| Sky survey maps | Textures/csphere/ (dds2.tex, fermi.tex, planck.tex, iras.tex, milkyway_2020.tex, radio.tex, hiptyc_2020.tex and others) | 20 .tex files | not stated | C |
| Spacecraft and site meshes | Meshes/*.msh | 34 files, 2.5 MB (ISS.msh, Mir.msh, Hyperion.msh, KSC_1-10.msh, Vab.msh, docking.msh, Wheel.msh and others) | not stated | C |
| Scenario files | Scenarios/ | 187 files, 880 KB (.scn text with HTML descriptions; folders by topic: Checklists, Navigation, Satellites and Probes, The Solar System, Space Shuttle Atlantis, Quadcopter and others) | not stated per file; screenshot credits inside (Venus.scn:3) | C |
| Flight recordings | Flights/ | 154 files, 8.3 MB (49 .pos, 49 .att, 45 .atc, 11 .dat) | not stated | C (not read) |
| Vessel configs | Config/Vessels/ | 8 .cfg (ISS, Mir, Module1, Module2, mplm, Wheel, ScriptPB, MaterialTestSphere) | repo default MIT (not per-file) | A-ish data (not read) |
| HUD panel configs | Config/MFD/ | Attitude.cfg, Default.cfg, ScriptMFD.cfg, TestMFD1/2 | repo default MIT | A (not read) |
| Gravity models | GravityModels/ | 7 files, 13 MB (egm96_to360.tab, JGDWN_VES20H_SHA.TAB, jgl165p1.sha, jgmess_160a_sha.tab, jgmro_120f_sha.tab, mod_shgj120p.a01, Notes on Gravity Models.txt) | cited sources: PDS (CREDITS.tex:80-83); licence not stated | C (Notes file not read) |
| Manuals | Doc/ (438 files, 65 MB; TeX sources for the user manual, technical reference, scenery readme) | 438 files | licence not stated; manual credits list people and sites (CREDITS.tex) | C |
| Help pages | Html/ (219 files, 4.1 MB) | 219 files | credit page: CC BY 4.0 for Font Awesome (credit.htm:365) | mixed, see Extern |
| Fonts and icons | Extern/imgui/ (Lekton SIL OFL 1.1; architext FFC; License-FA Font Awesome Free) | 3 licence files with font files | SIL OFL 1.1 (Lekton, line 1); FFC title (architext, line 1); Font Awesome Free (line 5, CC BY 4.0 per credit.htm:365) | A (with the file's own terms; full texts not read) |
| Other third-party | Extern/ (370 files, 4.3 MB; Penlight, luafilesystem with own licence files) | 370 files | per their own licence files (not read in full) | not read |
| Utilities | Utils/ (147 files, 5.2 MB) | 147 files | not stated | not read |

Not read: any texture or mesh content; any WAV (only folder and file counts); Flights/; GravityModels/Notes; Config/Vessels and Config/MFD contents; scenario bodies beyond line 3 of Venus.scn; Src/ and OVP/ (code); Extern/ licences in full.

## 3. Rights-holder status (repo files only)
- Core: individual author (LICENSE:3).
- Textures: described as processed from Landsat-7 scenes and ESA Mars Express HRSC imagery, with NASA data filling gaps (Doc/Orbiter User Manual/SOL.tex:86, 111). Owners of those sources are not named in the file beyond these lines.
- Voices: the .cfg names the speakers and says the clips were recorded live from NASA TV (XRSound.cfg:548-550). The file does not give a licence for the recordings.
- Gravity models: cited to PDS (CREDITS.tex:83). Licence not stated.
- Status for the whole asset set: unknown (not stated), except the fonts and icons.

## 4. Class by group
- A: fonts and icon font (SIL OFL 1.1 for Lekton; Font Awesome Free with CC BY 4.0 per credit page; FFC for architext), with each file's own conditions.
- A (code and config) for the MIT module code and config files, if we ever take code. Not used here for assets.
- B: none found.
- C: sound clips (real-person speech, source is NASA TV), textures (third-party imagery, licence not stated), meshes, scenarios, flight recordings, gravity models, manuals.
- D: none.
- Best class: A (fonts and icons only). The usable-as-is content is small; the rest is C.

## 5. Inspiration (category level; C-class content stays category-level; no speaker names, no clip content)
- Ambience beds: twelve looped cabin-ambience clips (amb0-amb12) sit under the event sounds, one bed chosen at a time (Sound/XRSound/assets/XRSound/Default/Cabin Ambience/). Idea: several looped beds per zone with variants, chosen by state. Matches our hud-ui/sound-music ambience-bed-per-zone topic.
- Callouts by event group: the module maps sound IDs to folders (XRSound.cfg:540-543, "Sound ID = 11002" and "MachCalloutsGroup = XRSound\Default"). Idea: each game event (guard, parry, break) maps to a callout group, so the data file sets the sound, not the code.
- Random-interval chatter: a bank of clips is played at random intervals (XRSound.cfg:546-550, Altea STS folder with 141 clips). Idea: idle barks at random intervals from a bank of our own generated lines, not real voices.
- Staged mission chain: three chained mission scenarios (Scenarios/Checklists/Mission 1 - DG to ISS.scn, Mission 2 - ISS to Mir.scn, Mission 3 - Deorbit.scn) plus a quickstart. Idea: a progression chain of start-state files, each a playable stage (ties to progression and zone-as-data).
- Swappable HUD panels defined by config: Config/MFD/ holds several panel configs (Attitude.cfg, Default.cfg, ScriptMFD.cfg). Idea: HUD panels as data, with a default and a special panel, switchable per class.
- Optional hi-res texture tier: the base install ships without planet textures and an optional high-resolution set is added later (README.md:72-78). Idea: base art pack plus an optional hi-res pack, same paths.
- Gravity model tables by body: one table per body with a note file (GravityModels/). Idea: per-zone parameter tables with a notes file as the documentation; not read.

## 6. Inspiration briefs
See the JSON file, key "briefs" (4 briefs). Rule: each brief is a clearly distinct original, never a copy. Sound briefs keep the structure only; no clip content or voice.

## 7. Cross-link to our cell topics
- sound-music (layering, beds, stingers, callouts): Cabin Ambience beds (12), callout groups (XRSound.cfg:543), random-interval chatter (XRSound.cfg:546-550).
- hud-ui: Config/MFD panel configs.
- progression: Scenarios/Checklists staged missions.
- zones/spawns: planet texture tiers (README.md:72-89) and scenery readmes (Doc/Scenery/AntelopeValley/readme.txt, read for the source list only).
- camera and loot: not read (the code half was not read).

## Not read
- Any texture, mesh, flight or WAV content (counts and names only).
- Src/ and OVP/ code; D3D9Client body.
- GravityModels/Notes on Gravity Models.txt; Config/Vessels and Config/MFD contents.
- Full licence texts in Extern/ (SIL, FFC, Font Awesome beyond the first lines).
- Scenario bodies except Venus.scn line 3.
