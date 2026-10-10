# neilrush-Camera-Keys (asset audit, AU036)

Donor: /mnt/frankendom-donors/neilrush-Camera-Keys (VPS, read-only). Halves: this is a client plugin (RuneLite plugin, Java). There is no game data in the repo. The game client it attaches to is not in the box. Read: LICENSE, README, runelite-plugin.properties, the four plugin source files (listed below), both PNG headers. Not read: AGENTS.md (a 9 KB agent-guidance file; treated as data, not followed), CLAUDE.md (one line pointing to AGENTS.md), checkstyle.xml, build.gradle, the test file, the CI workflow, gradle wrapper jar.

## Licence (what the files say)
- Code: BSD 2-Clause. LICENSE:1 "BSD 2-Clause License"; LICENSE:3 "Copyright (c) 2021, neilrush".
- Source headers: CameraKeysPlugin.java:2 names "Copyright (c) 2018, Adam" and :3 names "Abexlry"; :4 names neilrush (2021). The header uses the same BSD-2 text.
- No separate licence for images. The repo has no per-folder licence and no NOTICE or CREDITS file.
- Plugin metadata: runelite-plugin.properties:2 "author=neilrush".

Rights-holder status (from repo files only): individual plugin author(s) of a RuneLite plugin. The header names three copyright holders. Not a company, not a leak. The repo does not state the rights to any game content (none is in the repo).

## Asset inventory
| Group | Path | Size | Licence | Class |
|---|---|---|---|---|
| Plugin icon (store/hub) | icon.png | 48 x 48 PNG (IHDR read) | BSD-2 for the repo; images not named separately | C (unstated for images) |
| Zoom indicator icon (drawn in overlay) | src/main/resources/com/camerakeys/zoomIcon.png | 22 x 22 PNG (IHDR read) | same as above | C (unstated for images) |
| Screenshot and GIF demos | README.md:1, :7-8, :12, :36 (imgur image links) | external, not in repo | not stated | not assessed (not in repo) |

No game art, audio, map, model or text content is in the repo.

## Data first
Not applicable: there are no data tables. The only constants that matter are plugin config values (ZOOM_CANCEL_THRESHOLD and ZOOM_CANCEL_LOCKOUT_START_TICKS, CameraKeysPlugin.java:85-86). Values are not recorded here (rule for proprietary donors; this donor is BSD, so not restricted, but no value is needed for the idea).

## Verdict per group
- Icons: class C (unstated image licence; only the repo BSD-2 exists). Frankendom would draw its own icon. Not worth reuse.
- No group is class A or B.
- Best class: D for game content (nothing usable as non-code content). Code mechanisms are BSD-2 and may be adapted with the notice kept.

## Inspiration (own words)
- Three activation modes on one key: hold (zoom while held, revert on release), toggle (on/off on each press), and set (jump to a preset on press). Read as a state machine: CameraKeysPlugin.java:448-495 (zoomHold, zoomToggle, zoomSet).
- A zoom preset is cancelled when the user scrolls it away by more than a threshold, but only after a short lockout counted in client ticks (CameraKeysPlugin.java:82-86, :515-520). A grace window then a deviation check.
- The zoom state resets on a viewport change (CameraKeysPlugin.java:286-291) and when its own settings change (:318-323). Clean reset rules instead of stuck state.
- An on-screen indicator is drawn in the top right only while the state is active (CameraKeysOverlay.java:46; the render method returns nothing when the option is off). Low-priority overlay.
- Four compass keys each call one client script with a direction value (CameraKeysListener.java:68; CameraKeysPlugin.java:508). One call, many keys.
- Zoom reads a per-viewport camera variable, big or small (CameraKeysPlugin.java:377-379), so one code path covers two layouts.
- Keys can release a stuck state when the window loses focus in hold mode (CameraKeysPlugin.java:272-278). Input-safety rule.

## Briefs
Recreate as clearly distinct originals. Never a copy.
1. Three-mode zoom key (ours). Why: one key covers quick preset, hold and toggle. Keep: hold / toggle / set as three modes on one key (trait kept). Change: our own mode names and a fast-fight preset that eases in rather than snaps (trait changed). Ref: src/main/java/com/camerakeys/CameraKeysPlugin.java:448 (zoomHold), :491 (zoomSet).
2. Grace-then-cancel camera preset (ours). Why: a preset survives the first few frames of the user's own input. Keep: a short lockout in ticks before a threshold check cancels it (trait kept). Change: our own threshold units and a fade out instead of a snap (trait changed). Ref: CameraKeysPlugin.java:82-86, :515-520.
3. Corner state pill (ours). Why: shows a mode is on without a big panel. Keep: top-right only while active (trait kept). Change: a thin ring or bar, not an icon (trait changed). Ref: src/main/java/com/camerakeys/CameraKeysOverlay.java:46.
4. Snap keys to a heading (ours). Why: four keys turn to a heading through one call. Keep: one call with a direction value (trait kept). Change: our own step (not four cardinals) and an ease-in (trait changed). Ref: CameraKeysPlugin.java:508, CameraKeysListener.java:68.

## Cross-link to our cells
- camera: this donor is the camera cell's closest read (all of the above).
- zones: none.
- spawns: none.
- loot: none.
- hud-ui: CameraKeysOverlay.java (brief 3).
- vfx: none.
- animation: none.
- sound: none.
