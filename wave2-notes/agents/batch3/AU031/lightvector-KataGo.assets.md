# lightvector-KataGo (asset audit, cell AU031)

Donor: /mnt/frankendom-donors/lightvector-KataGo (VPS, read-only). Go engine (C++ with Python training code).
Code licence: MIT-style permission text for all content other than the listed third-party parts (LICENSE line 13, permission text from line 20). The lines read do not name the licence. Third-party libraries under cpp/external carry their own licences (LICENSE lines 1-6); cpp/core/sha2.cpp embeds its own (lines 7-8).
Asset licence: the same LICENSE covers every non-library file. The repo has no game art, sound or music. Neural network weights are not in the repo (README lines 149-154 point to separate downloads).
Rights holder status: open-source project. LICENSE line 17 gives "Copyright 2025 David J Wu ("lightvector") and/or other authors". No leak or decompile statement.
Best class: D for game use. The documentation diagrams would be class A, but they are not game content.

Checked: LICENSE (lines 1-30), README.md (licence section line 267, human-style section lines 147-154, analysis output line 243), docs/Analysis_Engine.md (option lines 91-94, 264), tree listings of images/, misc/, cpp/configs/, cpp/tests/analysis/, python/testdata/. Confidence high on the licence text. Medium on the file inventory (names only).

## Halves read
- Engine: README and docs (the analysis API) read. cpp/ source not read; only the tree and test names.
- Client or GUI: not in this repo. The README names external GUIs. No client is in the box, so nothing to pair.

## Asset groups
1. images/docs/: 23 png diagrams (about 4.2 MB for images/). Same LICENSE. Class A, not game content.
2. cpp/configs/: 10 entries, including rank-imitation configs (gtp_human5k_example.cfg, gtp_human9d_search_example.cfg). Text under the same LICENSE.
3. cpp/tests/analysis/*.txt and python/testdata/benchmark_data_1024.npz (binary, not opened). Fixture names show the API cases tested (ownership, focus, PV visits, eval cache).
4. misc/: bot lists (ogs.txt, kgs.txt), three bad-game lists under badgogodgames/, six sgf files in the tree. Names and counts only.
5. docs/rules*.html: three rules pages. Text, not game art.

## Inspiration (own words)
- Per-cell ownership field: one value per board cell from -1 to 1, plus one per candidate move (Analysis_Engine.md lines 91-93). Keep the field drawn as heat; change it to zone-control heat for our arena with a different palette.
- Expected score next to win rate (README.md line 243): two readouts for one state. Keep both; change to win chance plus expected damage swing in the fight HUD.
- Cost switch on the heavy layer: the ownership option doubles memory use and slightly lowers speed (Analysis_Engine.md line 91). Keep the layer opt-in; apply the same rule to heavy HUD overlays on phones.
- Rank-shaped opponent (README.md lines 149-154; cpp/configs/gtp_human5k_example.cfg): an opponent that imitates a stated level. Keep the human-looking mistakes; change the level into a style with three tells.
- Per-move preview (Analysis_Engine.md line 93): the same field for each candidate move. Keep the per-option read-out; change it to a per-attack damage-zone preview.
- Named regression list (misc/badgogodgames, names only): a list of known bad cases. Keep the idea for fight tests; use our own fight situations.

## Briefs (3)
Dom's rule: recreate as a clearly distinct original, never a copy. Kept and changed traits are named. Category-level only (MIT text, but no game art is present to copy).
1. Zone-control heat overlay (ref Analysis_Engine.md lines 91-93; README.md line 243). Keep: one value per cell, cool-to-warm ramp, opt-in layer. Change: two faction colours, zone-edge outline, debug or tactics mode only.
2. Human-paced opponent with visible tells (ref cpp/configs/gtp_human5k_example.cfg; README.md lines 149-154). Keep: level sets how it errs, not random noise. Change: a fighting style with three named tells and our own animations.
3. Two-number fight readout (ref README.md line 243). Keep: probability beside magnitude. Change: win chance and expected damage swing, our own labels.

## Cross-link
- Camera and HUD: the heat overlay brief, and the cost rule for heavy overlays.
- Spawns, loot, progression, sound: none in this donor's assets.

## Not verified / not read
- cpp/ source files (tree and test names only).
- SelfplayTraining.md and TrainingHistory.md at the repo root (not opened).
- Diagram content, misc/*.txt content, python/ scripts, the npz file (binary).
