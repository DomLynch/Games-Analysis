# pshenok-server-survival (hud-ui, cell 16)

Donor: `/mnt/frankendom-donors/pshenok-server-survival/src/input/handlers.js` | Licence: as read: MIT (LICENSE: "Copyright (c) 2025 Kostyantyn Pshenychnyy"; MIT permits adapting the code) | JavaScript (ES modules, three.js) | symbol touch listeners `touchstart` (1013), `touchmove` (1043), `touchend` (1068), `touchcancel` (1083)

Checked: The touch mechanism was read end to end: handlers.js 975-1110 (blur, `endPointerInteraction`, all four touch listeners, the header comment at 991-1000), 396-500 (`handlePrimaryDown`, read in full), 908-935 (`finishNodeDrag`), 160-235 (pan and zoom helpers, read in part: `panByScreenDelta` and `setZoom`), and state.js 40 (default tool). The hint file `game.js` was not the touch code; a grep for touch found only handlers.js. Confidence: high on the order of operations and on both defects (each is confirmed by where the snap call is and is not made). Medium on feel: nothing was run in a browser. Not read in depth: the rest of the hud-ui topic (`metrics-panel.js`, `failure-badges.js`, `hints.js`, `toolbar.js`, `hud-tabs.js`); see section 6 for the grep-only findings. camera_scope: not applicable (this is the touch UX cell).

## 1. Mechanism

- Model: the board is a three.js scene; a touch is turned into the same primary-pointer handler a left click uses, and two fingers are a camera gesture. The header comment (991-1000) says the board "is otherwise unreachable on a touchscreen" and that two fingers "takes over pan (from the midpoint) and zoom (from the finger spacing) at once".
- One finger goes down (1013-1041). The listener always calls `preventDefault` (1038) so a tap cannot also become a synthetic click or a page scroll. It then calls `handlePrimaryDown` (1040), which is the left-click routine. What a tap does depends on the active tool (default `select`, state.js 40):
  - select: a service below the critical health (fallback 40, handlers.js 410) is repaired instead of grabbed, and the function returns if the repair succeeds (411-421). Otherwise a service or the internet node is grabbed (422) and the drag flags are set; the touch then moves the node until release.
  - placement tools: a tap on empty ground creates the service at once, snapped to the grid (486). This happens on press, not on lift.
  - delete and unlink act at once on press; connect is two taps, not a drag: the first selects a node and the second links it (424-470).
- A second finger goes down (1016-1027). If a node is held, it is dropped (1017-1019) by clearing the drag flags only; no snap is called. Then panning starts (1021), the midpoint is recorded (1022-1024), the finger spacing is recorded (1025) and the current zoom is recorded (1026). Default is prevented and the function returns.
- Moves with two or more fingers (1044-1057): the view pans by the change in midpoint (1046), and zoom becomes `pinchStartZoom * (dist / pinchStartDist)` (1052). That value goes through `setZoom`, which clamps to 0.5 to 3.0 (202-203, 209).
- A single-finger move (1062-1065) changes the node only while a node is held. Touch has no hover, so a stray single-finger move does nothing else.
- Lifting one of two fingers (1068-1072): panning and the spacing are cleared. Lifting the last finger (1074) calls `finishNodeDrag`. That function (912-935) returns at once if nothing is dragged (913); otherwise it snaps the node to the grid (916), rejects a drop onto a tile another service occupies (922, distance under 1 unit), and in that case snaps back to the drag start (925).
- `touchcancel` (1083-1088): clears panning and spacing and calls `endPointerInteraction` (1086). That function (981-990) clears the drag flags (983) and does not snap.
- Tick: none of its own. Every step is driven by the touch events; the per-frame motion comes from `handlePointerMove` on each `touchmove`.

## 2. Key functions

- `touchstart` listener: `/mnt/frankendom-donors/pshenok-server-survival/src/input/handlers.js` 1013-1041 (two-finger branch 1016-1027; one-finger branch 1038-1040).
- `touchmove` listener: same file, 1043-1066 (pan 1046; zoom 1052; node move 1062-1065).
- `touchend` and `touchcancel` listeners: same file, 1068-1076 and 1083-1088.
- `finishNodeDrag`: same file, 912-935 (snap 916, overlap 922, revert 925).
- `handlePrimaryDown`: same file, 396-500 (tap meaning per tool; repair 410; grab 422; placement 486).
- `endPointerInteraction`: same file, 981-990 (clears the drag flags without a snap).
- `setZoom`: same file, 208-219 (clamp 209).

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constants |
|---|---|
| One finger is the primary pointer; two fingers take over as the camera gesture | Rule only: two or more touches (1016, 1044); no timer |
| Pinch zoom is start zoom times the finger-spacing ratio | Ratio (1052); clamp 0.5 to 3.0 (202-203) |
| Pan follows the midpoint delta | Midpoint delta (1046); no constant |
| Dropping a held node is a release with snap and overlap rejection | Tile snap by `snapToGrid` (grid size not read); overlap distance under 1 unit (922) |
| A tap on a damaged unit repairs it instead of grabbing | Critical health fallback 40 (410) |
| Commit timing of a tap | None: the tap acts on press (1040); there is no hold window or commit delay |

Defects found, with the fix for each (keep the idea, fix the defect):
1. The first finger of a two-finger gesture can act. With a placement tool active, the first touchstart calls `handlePrimaryDown` (1040), which creates a service on the ground (486) before the second finger arrives (1016). A pinch on empty ground therefore places a service. Fix: commit a placement on lift, and only if no second finger has come down. This needs no timer, and the sketch does it that way.
2. A node released by a second finger (1017-1019) or by `touchcancel` (1086, then 983) skips the snap and the overlap rule in `finishNodeDrag` (913-925). Every normal release does get them (mouse release 966, window blur 975, last finger 1074). A pinch-dropped or cancelled node can stay off the grid and on top of another service, which is the overlap the rule was written to stop (comment at 918-920). Fix: send both paths through `finishNodeDrag` (or the same snap-and-revert code) before clearing the flags. The sketch models this with `releaseGrab`.

## 4. TypeScript sketch

simplified: the sketch keeps the donor's rules: two or more fingers are a camera gesture, a second finger releases a held node and cancels a pending placement, and a grab snaps on release. It omits the raycast that decides what a touch hits, the repair branch, the connect, delete and unlink tools, the pan and zoom maths, the tile snap and overlap rule (the caller runs them on `releaseGrab` and `snapGrab`), and the mouse path. It reorders one thing on purpose: a placement commits on lift (the `end` call), not on press (donor 1040), which is the fix for defect 1.

```ts
// Licence of donor: MIT (LICENSE). Clean-room sketch from the described mechanism; the donor's touch handlers are not translated.
type Mode = "none" | "armed" | "grab" | "pinch";

export class TouchArbiter {
  private mode: Mode = "none";
  private armedAt: { x: number; y: number } | null = null;

  // Called on each touchstart. fingers = number of fingers now down. tool = what a single touch does.
  start(fingers: number, x: number, y: number, tool: "place" | "grab"): { releaseGrab: boolean } {
    if (fingers >= 2) {
      // Two or more fingers is a camera gesture. A held node is released now, through the same
      // snap-and-overlap rule as a normal release, and a pending placement is cancelled.
      const releaseGrab = this.mode === "grab";
      this.armedAt = null;
      this.mode = "pinch";
      return { releaseGrab };
    }
    if (this.mode === "pinch") return { releaseGrab: false };
    this.mode = tool === "grab" ? "grab" : "armed";
    this.armedAt = tool === "place" ? { x, y } : null;
    return { releaseGrab: false };
  }

  // Called on each touchend. remaining = fingers still down after this lift.
  end(remaining: number): { placeAt?: { x: number; y: number }; snapGrab: boolean } {
    if (remaining > 0) return { snapGrab: false };
    const out: { placeAt?: { x: number; y: number }; snapGrab: boolean } = { snapGrab: this.mode === "grab" };
    if (this.mode === "armed" && this.armedAt) out.placeAt = this.armedAt;
    this.mode = "none";
    this.armedAt = null;
    return out;
  }
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, exit 0 (file `/tmp/pshenok-touch-arbiter.ts`). The sketch was not run; only the types were checked.

Best transferable idea: decide a touch's meaning on lift and keep the second finger as a camera or cancel rule, so a pinch never fires the first finger's action and any held item is released through the same snap rule as a normal release.
Decision (proposed): adapt. The arbitration (one finger = the primary action, two fingers = camera, a second finger cancels the first and releases through the normal release) fits a touch-first client. But the donor's press-to-act and its unsnapped drop must change; the commit-on-lift and the shared release are the fixes.
Acceptance: on a 375-wide touch screen, a two-finger pinch that starts on empty ground places nothing; a single tap still acts (a placement appears on lift); a node dropped by a second finger or a cancelled touch lands on the same grid tile rule as a normal release, and a drop onto an occupied tile returns it to where it started. A unit test asserts both.

Reuse tag: rewrite-from-idea (MIT: code may be adapted; the sketch is written from the mechanism, not copied)
Brief rule served: one engine (touch is intake only; the camera and the HUD stay client-side); rule that the client never decides an outcome (the arbiter sends intents, the engine resolves them)

## 5. Lands in

- TARGET `src/fight/intake-touch.ts` (new, client touch intake: maps one-finger and two-finger touches to fight intents and to camera). Parity-checklist row 5 (controls/input, intake). The parity hint for this cell was row 14 (HUD), but the mechanism is input intake, so row 5 is the right row.
- Reuse tag: rewrite-from-idea (MIT; adapt allowed, sketch written clean)
- Brief rule served: as above

## 6. Gaps and risks

- Commit on lift changes the feel. A tap acts when the finger leaves the screen, not when it lands. For builder placement that is fine; for a fast duel (a tap attack or a guard) it adds the time of a tap. Frankendom must decide per action whether touch commits on press (and then a second finger cannot cancel it) or on lift. Not tested here.
- A two-finger gesture in a duel has no donor meaning. The camera pinch transfers; any second-finger action in a fight (a guard, a dodge) must be an engine rule and must be shown as an intent, not as a camera move. The donor has no server and no fight rules.
- The zoom bounds 0.5 to 3.0 (202-203) are client constants (camera, client-only). They are not game data.
- Kills, hits and placements are not server-verified in this donor. Frankendom must send the touch result as an intent, and the server must verify it (kills are server-verified).
- The donor's comment above line 1038 about the synthetic click (always prevent default on touch) is worth keeping as a rule for the Pit.
- Also seen in the hud-ui topic (not part of the touch mechanism):
  - Minimap, world map, lock-on and target frames: none. A grep of src, game.js, index.html and style.css for minimap, world map, lock-on, target frame, health bar and radar found only a comment about AWS target tracking (src/config.js 761), a comment about camera pan (game.js 1128), and a 3D health bar above each service (src/entities/Service.js 382-383, not read in full). There is no lock-on forgiveness and no input buffer. The word "buffer" in the input code is the service queue (handlers.js 688).
  - Metrics panel: queue depth is drawn as a sparkline column and is flagged when at or above 90% of the maximum queue size (src/ui/metrics-panel.js 48; grep excerpt, the file was not read in full).
  - String table: `src/locales/` holds 11 locale files (de, en, fr, hi, it, ko, nep, pt-BR, ru, uk, zh). Each has 930 keys (counted by grep, key sets compared by name): 0 keys missing and 0 extra against en.js. Placeholders are `{name}` with 29 distinct names, identical across all 11 files; 49 lines carry one. No string repeats a placeholder (grep, none found), so the first-match-only replace in `src/i18n.js` 57 does not bite today. Lookup falls back to the raw key (`src/i18n.js` 53), not to English. There is no plural function; the table has no plural forms. `setLocale` logs the whole table to the console (`src/i18n.js` 35), a debug leftover. The Hindi header (hi.js 8) sets a glossary rule: one rendering per concept, with CS and cloud terms kept in Latin script. The grammar is the Hinglish register; nothing is quoted here.

## Checker findings (Sonnet 5.5 medium, 2026-10-12)

Verdict: CLEAN.
- Errors: none material; touch listener lines, 40 default, 0.5-3.0 zoom clamp, finishNodeDrag 912-935, endPointerInteraction no snap, both defects confirmed. Trivia: i18n console.log(table) is line 36.
- Missed: The donor comment at 908-911 claims finishNodeDrag is shared by touch cancel, but touchcancel calls endPointerInteraction (no snap); defect 2 could cite that contradiction.
