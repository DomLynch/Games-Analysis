# ZenKit (asset audit, AU060)

Donor: /mnt/frankendom-donors/ZenKit/ (357 files, 47 MB under tests/samples/)
Code licence: MIT (license.md line 1; copyright line 2: GothicKit Contributors).
Asset licence: none separate. Treated as unclear (class C). Game art: none in the box (class D for any game art).
Rights holder: library by GothicKit Contributors. It re-implements the file formats of the ZenGin made by Piranha Bytes for Gothic and Gothic II (readme.md line 17), and says it is heavily based on ZenLib (readme.md line 18). Game data owner is not stated in the files read.
Best class: C.

## Half read
- Read: the data-format library half (src/vobs/Misc.cc in part, docs/engine/objects, tests/samples layout and readmes).
- Game-data half: NOT in the box. The readmes say the world, script and message tests need a user-owned Gothic 1 copy (tests/samples/world.zen.readme line 1; menu.dat.readme line 1; ou.bin.readme line 1).
- Paired donor in the box: OpenGothic (the engine side). Not in this batch, not read. ZenLib is not in the box.

## Licence, plainly
- The repo is MIT for the software (license.md).
- No file states a licence for docs, samples, or logos.
- Test samples under tests/samples/G1 and tests/samples/G2 carry no licence line in the files read. Origin is not stated in the files read.

## Asset inventory (non-code only)
| Group | Path | Count | Class |
|---|---|---|---|
| Gothic 2 world objects and saves (binary) | tests/samples/G2/ (VOb/*.zen, Save/, SaveFast/*.SAV, MAT, FNT, MAN); tests/samples/G1/ | about 50 .zen; 24 .SAV repo-wide | C |
| Other binary samples and archives | tests/samples/*.vdf, *.msb, *.mmb, *.mrm, *.mdh, *.mdm, *.tex, *.zen | count not taken | C |
| Logos | assets/logo.png (1123 x 263), assets/logo-square.png (263 x 263), two SVG; docs/assets logos | 6 files | C |
| Docs icons | docs/assets/icons/spacer-*.png | 14 PNG repo-wide | C |
| Class property catalogue (YAML) | docs/engine/objects/*.yml | 11 files, plus _generate.py and _template.mdt | C |
| Format and class docs (prose) | docs/engine/formats/, docs/engine/objects/*.md, docs/library/ | 101 .md repo-wide | C |

Pixel sizes of the two logos come from the PNG header bytes only. No maps, audio, fonts or game art are in the box; the samples are binary and were not opened.

## Data first
- The class catalogue in docs/engine/objects/*.yml is the table: each class lists properties, types and version identifiers per game, plus the source site. oCMOB.yml is the example (line 6 description).
- Binary sample files are the test data for the parser; they were not opened.

## Inspiration (class C: category level)
- Trigger as an event filter and relay: check who touched it, check whether it reacts to that kind of event, relay to a target, enable or disable at runtime (docs/engine/objects/zCTrigger.md lines 16-18).
- Touch damage as a timed volume: damage on what sits inside, with a repeat delay, an impact-volume scale and a collision type (src/vobs/Misc.cc lines 198-212).
- Carryable props: a movable object that can be moved or carried (docs/engine/objects/oCMOB.yml line 6).
- Class-by-class catalogue with versions in YAML: a model for our catalogue-as-runtime-source (Parity rows 20-21).
- Versioned parse functions that take a game-version argument (src/vobs/Misc.cc line 194): one loader for several versions. The format itself is not ours to copy.
- Zone-scoped fog, music and far-plane volumes as separate classes (names only: zCZoneZFog, oCZoneMusic, zCZoneVobFarPlane).

## Briefs (Dom's rule: recreate as a clearly distinct original; never a copy)
1. **Pressure-plate hazard (timed damage volume).** Keep: damage only while inside, on a repeat delay, with a tick sound. Change: telegraph each tick with a rising rim pulse; use gas, spikes or rising water rather than fire; all numbers in zone data. Ref: src/vobs/Misc.cc (VTouchDamage::load); docs/engine/objects/zCTouchDamage.md line 16.
2. **Relay trigger (filtered volume that tells a target).** Keep: two checks (who touched, whether this trigger reacts), then a relay; enable and disable at runtime. Change: combat-named events (enter, leave, hit, clear) and a per-zone target list that feeds the spawn director. Ref: docs/engine/objects/zCTrigger.md lines 16-18.
3. **Carryable crate.** Keep: a prop class with a move-or-carry flag. Change: our own silhouettes (sack, barrel, lantern) and a weight rule that slows the carrier. Ref: docs/engine/objects/oCMOB.yml line 6.

## Cross-links
- Zones: trigger volumes, touch damage and zone atmosphere classes (names only for fog and music).
- Spawns and encounters: the relay trigger is the wiring for a fight start (not read further).
- Progression and loot: a carry flag for props; saves are binary and not read.
- Parity rows: 20-21 (catalogue), 23 (zone population) for the trigger relay idea.

## Not verified
- The game-data half (absent) and all binary samples (names and extensions only).
- src/ beyond src/vobs/Misc.cc; DaedalusVm.cc, SaveGame.cc, World.cc not read.
- Most docs and the yml files beyond the oCMOB.yml description line.
- Vendor submodules (doctest, mio, libsquish) are named in .gitmodules but not in the tree; their licences were not read. ZenLib is not in the box.
- Logo pixel sizes beyond the two PNG headers.
