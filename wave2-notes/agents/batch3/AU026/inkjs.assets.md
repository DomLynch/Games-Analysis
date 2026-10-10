# inkjs (asset audit, AU026)

Donor: /mnt/frankendom-donors/inkjs/ (VPS, read only). Version 2.4.0 (package.json line 3). A JavaScript/TypeScript port of the ink narrative scripting runtime and compiler.
Half read: RUNTIME (src/engine, partial) and the COMPILER (src/compiler, names and one enum only), plus the template data (compiled story JSON in templates/). The ink SOURCE stories (.ink files) are not in the box: no .ink file is in templates/ or docs/ (the template listing was complete). So the story-authoring half is absent and the compiled story is the only story data here.

## 1. Licence files (as the files say)
- LICENSE.md: MIT License. Copyright (c) 2017 inkle Ltd. and (c) 2017 inkjs contributors (see AUTHORS).
- package.json line 56: "license": "MIT".
- AUTHORS.md line 3: inkle Ltd. (@inkle) is credited for the original source code. Other named people are port and compiler contributors.
- No separate licence for the logo (media/inkjs.png) or for the sample story templates is stated in the files read.

## 2. Asset inventory (what is actually here)
- media/inkjs.png: 54,574 bytes, a project logo. No separate licence line. Not opened.
- templates/ (5 templates, 22 files including the compiled stories): browser_serverless (ink.js, story.js 154 KB, main.js, index.html, style.css), browser_with_server (ink.js, ink.js.map, story.json 154 KB, main.js, index.html, style.css), nodejs (index.js, intercept.ink.json 154 KB), typescript_player (src/index.ts, src/story.json 154 KB, tsconfig, package.json), typescript_with_compiler (src/index.ts, tsconfig, package.json).
- The compiled story JSON files are all the same size class (about 154 KB each; inkVersion 20 in typescript_player/src/story.json). I did not read the story text beyond the file names and the version header. Authorship of the sample story text is not stated in the files read.
- docs/: compiler-differences.md (1.8 KB) and working-with-typescript-and-webpack.md (1.9 KB): developer notes, MIT by repo.
- script/inkjs-compiler.ts (7 KB): compiler entry point, code.
- src/: 524 files (TypeScript runtime under src/engine, compiler under src/compiler, parser and sequence and conditional hierarchy classes). Code under MIT.
- No audio, no sprites, no fonts, no maps, no UI art beyond the logo and the template CSS.

## 3. Rights-holder status (from repo files only)
- Port of inkle's ink. LICENSE.md names inkle Ltd. as copyright holder; AUTHORS.md names inkle Ltd. as the original source code owner and lists port contributors. Status: open-source MIT port of an original company's tool.

## 4. Classes per asset group
| group | path | class | why |
|---|---|---|---|
| runtime and compiler code | src/**, script/inkjs-compiler.ts | A | MIT (LICENSE.md, package.json line 56) |
| bundled builds | templates/*/ink.js and ink.js.map | A | MIT (repo) |
| docs | docs/*.md | A | MIT (repo) |
| logo | media/inkjs.png | C | MIT covers the repo; no separate logo line; treat as unclear |
| sample compiled stories | templates/*/story.json, story.js, intercept.ink.json | C | MIT covers the repo; sample text authorship not stated in the files read; class C until checked |
| template CSS, HTML, JS | templates/*/index.html, style.css, main.js | A | MIT (repo); not read |

best_class: A for code and docs (MIT). For non-code content the best class is C (logo and sample stories with unstated authorship).

## 5. Inspiration (narrative and UI mechanics; no visuals in the box)
- Sequence selectors on one line: stopping (the default), cycle, shuffle, once (src/compiler/Parser/ParsedHierarchy/Sequence/SequenceType.ts lines 1-6). Keep the four modes; use cycle and shuffle for idle barks and once for first-time lines. Change the content: barks keyed to fight events, not story beats.
- Tags on a line as a side channel: a tag carries metadata alongside printed text without changing it (src/engine/Tag.ts line 5; the tag class is dynamic). Keep 'tags route cues'; use tags for sound and emote cues on the fight bus (row 12), with our own cue names.
- Seeded random: the runtime uses a seedable PRNG because the platform has none (src/engine/PRNG.ts line 2); the seed is set in the constructor (line 6). Keep one seed that reproduces a whole sequence; store the seed in the fight record for replay (row 19).
- Budgeted step: the story can run for a millisecond budget and resume on the next call (src/engine/Story.ts line 349 ContinueAsync and line 355 ContinueInternal with a millisecond limit). Keep the 'stop after a budget and resume' shape; use it as the per-tick NPC budget (row 18 sub-line).
- Unbudgeted continue: ContinueMaximally (src/engine/Story.ts line 607) is the non-budgeted counterpart (name read; body not read). Keep the two modes: budgeted for live play, unbudgeted for tests (to confirm against the body).
- Save and load: StoryState.ts, JsonSerialisation.ts, StatePatch.ts and VariablesState.ts exist in src/engine (names only, not read). Likely a whole-state JSON snapshot; check before reuse (row 19).
- Compiler include model for browsers: a JSON file handler that holds all project files in one object (docs/compiler-differences.md line 7). Relevant to our catalogue as a single bundle, not to art.

## 6. Briefs (distinct originals only; Dom's rule: recreate as a clearly distinct original, never a copy; visual criteria do not apply: no art in the box)
- label: cycling barker line (own label, mechanic). why: one line that can cycle, shuffle or fire once. keep: stopping, cycle, shuffle and once selectable per line. change: barks keyed to fight events and enemy class; our own lines. ref: /mnt/frankendom-donors/inkjs/src/compiler/Parser/ParsedHierarchy/Sequence/SequenceType.ts lines 1-6.
- label: cue tag channel (own label, effect). why: per-line tags drive cues without changing the printed line. keep: tags carry sound and emote cues; the printed text is unchanged. change: our cue names, routed to the fight sound bus. ref: /mnt/frankendom-donors/inkjs/src/engine/Tag.ts line 5.
- label: seeded replay shuffle (own label, mechanic). why: one seed reproduces a whole random sequence. keep: a single seed that fixes the sequence. change: the seed lives in the fight record next to the inputs; no second RNG. ref: /mnt/frankendom-donors/inkjs/src/engine/PRNG.ts lines 2-7.
- label: budgeted story step (own label, mechanic). why: a long step stops at a time budget and resumes on the next tick. keep: stop after a budget, resume next tick. change: the budget is a per-tick NPC budget in our engine (row 18). ref: /mnt/frankendom-donors/inkjs/src/engine/Story.ts lines 349-355.

## 7. Cross-link (cells)
- sound-music (layering, stingers): tags as cue channel (section 5); no audio in the box.
- progression, loot, spawns, hud-ui, camera, zones: none in this donor (narrative runtime only).
- Death and respawn presentation, boss intro, idle animation vocabulary: none (no art or animation data).
- Readability at 375 wide: not applicable (no visual assets).

## Not read / not verified
- The sample story text in all five compiled stories (only names and the inkVersion header were read).
- media/inkjs.png (not opened).
- The template HTML, CSS and JS (names only).
- The runtime files beyond the cited lines: StoryState.ts, JsonSerialisation.ts, StatePatch.ts, VariablesState.ts, the compiler parser (names only).
- No donor code was built or run. Nothing was installed.
