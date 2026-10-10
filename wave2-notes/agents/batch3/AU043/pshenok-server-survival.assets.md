# pshenok-server-survival (asset audit, cell AU043)

Donor: /mnt/frankendom-donors/pshenok-server-survival (VPS, read-only). Halves: the browser game (index.html, game.js, src/) and the data inside it (src/campaign/levels.js, src/locales/, src/achievements/). Read: headers, file lists, counts, the level schema and sample level, the sound service, README lines cited. Paired donor in this batch: none.

## 1. Licences (as the files say)
- LICENSE: MIT License (line 1), "Copyright (c) 2025 Kostyantyn Pshenychnyy" (line 3). The only licence file in the repo. The text read was the first lines; it does not name an asset carve-out. The full MIT text was not re-read.
- Runtime libraries loaded from outside the repo: Three.js r128 from cdnjs (index.html line 27) and Tailwind from cdn.tailwindcss.com (line 26). Their licences are not in the repo.
- package.json description: dev tooling only, "The game itself has NO build step" (line 5).

## 2. Asset inventory (paths and counts)
- Music (2 MP3): assets/sounds/game-background.mp3 (4,267,757 bytes) and menu.mp3 (7,755,659 bytes), used in src/services/SoundService.js lines 22 and 27.
- Sound effects (3 MP3): click-5.mp3 (2,918 bytes, hover, line 34), click-9.mp3 (2,870 bytes, click, line 35), click-10.mp3 (4,910 bytes; no reference found in src, game.js or index.html).
- Demo GIF: assets/gameplay.gif (1,069,610 bytes), used in index.html lines 20 and 25 and README.md line 3.
- Scene art: none as files. Three.js primitives built in code: BoxGeometry 15 calls, CylinderGeometry 7, Torus 3, Sphere 3, Ring 3, Cone 3, plus three other polyhedra (grep counts). Example: src/entities/Service.js line 92 (box 3 x 2 x 0.5); game.js line 367 (box 6 x 1 x 10).
- Inline icons: index.html has 36 inline SVG tags and a favicon data URI (line 11).
- Campaign levels (data as code): src/campaign/levels.js (1,014 lines; 25 level entries; chapter header line 6 names four chapters; schema comments lines 1-34).
- Locales (text): src/locales/ with 11 files (de, en, fr, hi, it, ko, nep, pt-BR, ru, uk, zh). en.js 986 lines, about 930 key lines, 25 level_<id>_title keys.
- Achievements: src/achievements/definitions.js (226 lines, about 38 entries).
- Docs: docs/GAME_BALANCE_ANALYSIS.md (464 lines), docs/superpowers/plans and specs.
- Tests: 10 test files under tests/, including locales.test.mjs (locale drift guard, line 1).

## 3. Rights-holder status (repo files only)
One individual author named in the MIT line (2025). The repo is an original game by that author as far as the files say. No fan, leak or decompile statement. Music and sound effects show no author or licence line; status for them is unknown.

## 4. Best class
- A, conditional: code-built visuals, level data, locale text and docs under the repo MIT. The LICENSE names no asset carve-out, so this rests on reading the MIT as covering the whole repo. Attribution needed.
- C: music (2 tracks), sound effects (3 clips), demo GIF, inline icons. No per-file licence line.
- D: none.

## 5. Inspiration notes (own words)
- Burst-and-outage level script: a level can force a burst of spawns on a fixed interval (enabled, 5 s interval, burst of 30 in one level, levels.js line 122), and a scheduled outage at a set game time that restores after a duration, so the player sees traffic shift back (levels.js lines 20-24). Keep the schedule as data; recreate as a wave timeline with restore.
- Fail conditions as data: a reputation floor and a timeout per level (levels.js lines 60, 90: floor 50 with timeouts of 180 s and 135 s). Pattern for mission fail states.
- Four chapters as stages (levels.js line 6). Idea for progression: four unlocking stages.
- One-key view toggle: T switches between isometric and top-down (README.md line 168). Keep the single key and the plan view; change the angles and animate the switch.
- Hover and click sound pair: hover at 0.4 volume and click at 0.5 on separate audio objects (SoundService.js lines 34-39). Keep the two-tier UI split; use our own clips.
- Late music load with per-track volume: two loops, volume 0.2 and 0.3, loaded on first play (SoundService.js lines 15-30). Keep the late load; the tracks are about 4 MB and 8 MB, which is why.
- Score feedback row: a blocked attack costs one dollar of mitigation and shows +10 in the next column (README.md line 103; column headers not read). Keep the small cost and clear positive.

### Notes (no defect found in the lines read)
- The comment at SoundService.js line 15-17 explains why the tracks are not preloaded (the tracks are 89% of the repo's asset weight). That is a design note, not a defect.

## 6. Inspiration briefs
Rule for all briefs: recreate as a clearly distinct original, never a copy. Each names the trait kept and the trait changed.
1. Scheduled wave burst with a restore. Keep: interval burst with an enable flag and size; a timed outage that restores. Change: our wave shapes, a warning cue before each burst, and a restore that shows enemies redistributing. Ref: src/campaign/levels.js lines 20, 22, 24, 122.
2. Four-stage unlock path. Keep: four stages in order, each a fixed block of levels. Change: our own stage names and themes; a stage-end boss in place of a debrief. Ref: src/campaign/levels.js line 6.
3. Plan-view toggle on one key. Keep: one key to switch; a plan view that shows the whole map. Change: our camera angles and key; a tween between views; a minimap in the plan view. Ref: README.md line 168.
4. Quiet hover, louder click. Keep: two cues for two actions; hover quieter than click. Change: our own tick clip, and a separate cue for the buy action. Ref: src/services/SoundService.js lines 34-39.

## 7. Cross-link to our cell topics
- hud-ui: view toggle and score feedback row (sections 5 and 6, item 3).
- sound-music: two-track loop with late load and per-track volume; hover and click split (item 4 and section 5). Audio files are C, so ideas only.
- progression: four chapters and per-level fail conditions (item 2).
- spawns and encounters: burst schedule and forced outage (item 1).
- vfx and the visual scene: none usable (the scene is primitives in code, no art files).

## Not read
See not_read in pshenok-server-survival.assets.json. Main gaps: the bulk of src/ and game.js, the 112K index.html markup and CSS, audio content, GIF pixels, locale string values, tests, the balance doc, the full MIT text.
