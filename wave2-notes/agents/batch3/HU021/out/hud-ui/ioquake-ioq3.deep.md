# ioquake-ioq3 (hud-ui, cell 16)

Donor: `/mnt/frankendom-donors/ioquake-ioq3/code/cgame/cg_draw.c` | Licence: GPL-2.0-or-later (cg_draw.c header, line 10: "or (at your option) any later version."; the donor's COPYING.txt is GPL v2) | C | symbol `CG_DrawCrosshairNames`

Checked: Symbol `CG_DrawCrosshairNames` is at cg_draw.c 2039-2074 (read in full) and calls `CG_ScanForCrosshairEntity` at 2003-2031 (read in full). Fade helper `CG_FadeColor` is at cg_drawtools.c 328-351 (read in full). Second reader `CG_CrosshairPlayer` is at cg_main.c 409-414 (read in full); its client-command user `CG_TargetCommand_f` is at cg_consolecmds.c 34-45 (read in full). Callers: `CG_DrawCrosshairNames` is called only from `CG_Draw2D` at cg_draw.c 2554 (spectator branch) and 2575 (alive-player branch); `CG_ScanForCrosshairEntity` only from `CG_DrawCrosshairNames`; `CG_CrosshairPlayer` from cg_consolecmds.c 38 (read), 188, 219, 368 (not read) and from cg_main.c 61 (the UI syscall, read). Camera scope: not a camera cell. Confidence high on the target frame and its hold window. Not read: `CG_DrawStatusBar` (cg_draw.c 519-660), the HUD layout file `ui/hud.menu` (loaded by `ui/hud.txt`, but absent from this donor), and the server side of the `gc` command (cg_consolecmds.c line 44 sends it; the handler is not read).

## 1. Mechanism

- The target frame is a name label over the player the crosshair is on. It is driven by one timestamp and one id, and it is only updated while the HUD draws.
- Order of steps, per drawn frame (client):
  (a) `CG_Draw2D` draws the spectator branch (2554) or, if the player is alive (`STAT_HEALTH > 0`, 2557), the status bar, the ammo warning, the crosshair and then `CG_DrawCrosshairNames` (2575). Dead players get no name label.
  (b) `CG_DrawCrosshairNames` returns at once if the crosshair cvar is off (2044) or the name cvar is off (2047), or if the view is third person (2050). Only then does it scan.
  (c) `CG_ScanForCrosshairEntity` casts one ray from the view origin along the view axis for 131072 units (2009), masking solid and body contents and skipping the player's own entity. If the first hit is not a client (2013), it returns and changes nothing: the old target and its time stay. If the hit point is in fog (2018) or the hit entity has the invisibility powerup (2024), it returns and changes nothing. Otherwise it stores the client number and sets the time to `cg.time` (2029-2030). The timestamp is refreshed every frame the ray stays on the same player.
  (d) `CG_FadeColor(crosshairClientTime, 1000)` (2058) gives alpha 1 while the time since the last sighting is under 800 ms, then a linear fade over the last 200 ms (cg_drawtools.c 343-346), then no colour (NULL) at 1000 ms (338-339). A zero start time is treated as "never" (332-333).
  (e) The name is drawn centred at x=320, y=170, with alpha multiplied by 0.5 (2071).
- Second reader, same window: `CG_CrosshairPlayer` (cg_main.c 409-414) returns -1 once `cg.time` is more than 1000 ms past the last sighting (410-411), otherwise the stored client number. `CG_TargetCommand_f` (cg_consolecmds.c 38-44) sends `gc <target> <n>` to that player. The UI reaches the same value through a syscall (cg_main.c 60-61).
- Result: after the aim leaves a player, the name stays fully visible for 800 ms, fades over 200 ms, and an order aimed at that player still resolves for the full 1000 ms. This is the donor's lock-on forgiveness.
- Tick: none of this is in the game tick. It runs in the draw path, once per rendered frame, with `cg.time` as the clock.

## 2. Key functions

- `CG_DrawCrosshairNames`: `/mnt/frankendom-donors/ioquake-ioq3/code/cgame/cg_draw.c` 2039-2074 (gates 2044-2050, scan call 2055, fade 2058, draw 2071).
- `CG_ScanForCrosshairEntity`: `/mnt/frankendom-donors/ioquake-ioq3/code/cgame/cg_draw.c` 2003-2031 (ray 2009, client test 2013, fog 2018, invisible 2024, store 2029-2030).
- `CG_FadeColor`: `/mnt/frankendom-donors/ioquake-ioq3/code/cgame/cg_drawtools.c` 328-351 (start-time sentinel 332, hold check 338, fade 343-346).
- `CG_CrosshairPlayer`: `/mnt/frankendom-donors/ioquake-ioq3/code/cgame/cg_main.c` 409-414 (hold check 410, return 413).
- `CG_TargetCommand_f`: `/mnt/frankendom-donors/ioquake-ioq3/code/cgame/cg_consolecmds.c` 34-45 (read 38, send 44).

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Keep the last valid target for a fixed window after aim leaves it, then fade out over the final part of the window | Hold 1000 ms (theirs, cg_draw.c 2058); fade 200 ms (theirs, cg_local.h 37, FADE_TIME) |
| Pick the target by a ray from the view; a miss or a non-player hit keeps the old target and its time | Ray length 131072 units (theirs, cg_draw.c 2009); no range cap otherwise |
| Command target uses the same hold window (lock-on forgiveness) | The same 1000 ms, typed a second time (theirs, cg_main.c 410) |
| Fog and invisibility hide a target | Contents flag fog (2018) and powerup PW_INVIS (2024) |
| Name alpha is a fraction of the fade | Factor 0.5 (theirs, cg_draw.c 2071) |
| Name placement on the 2D frame | x 320 centred, y 170 (theirs, cg_draw.c 2071) |

## 4. TypeScript sketch

simplified: the sketch separates the update (once per client frame, from the input/tick path, with the aim result passed in) from the reads (the name alpha for the draw path, and the command target). It replaces the donor's 0 "never seen" sentinel with null, so a sighting at time 0 is kept. It omits the ray itself, the player's own entity skip, the fog and invisibility tests (the caller passes null for those), the third-person hide, the colour and screen placement, and the MISSIONPACK branch. One boundary differs from the donor: the sketch returns no target at exactly `holdMs` after the sighting, where the donor (cg_main.c 410) still returns it at exactly 1000 ms.

```ts
// Licence: GPL-2.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export interface TargetFrameData {
  holdMs: number;      // how long the last target stays after aim leaves it
  fadeMs: number;      // the last part of the hold, over which the name fades out
  rangeUnits: number;  // longest aim distance that can pick a target (zone data)
  nameAlphaScale: number; // extra factor on the name's alpha
}

export interface TargetFrame {
  targetId: number | null;
  lastSeenMs: number | null; // null = never seen (the donor uses 0 here, which loses a sighting at time 0)
}

// Once per client frame, from the input/tick path, with whatever the aim ray hit (or null).
// A miss or an out-of-range hit keeps the old target and its timestamp, as the donor does.
export function updateTarget(
  frame: TargetFrame,
  aimedId: number | null,
  distance: number,
  nowMs: number,
  data: TargetFrameData,
): void {
  if (aimedId === null || distance > data.rangeUnits) return;
  frame.targetId = aimedId;
  frame.lastSeenMs = nowMs;
}

// Alpha of the name at nowMs: 0 = hidden, 1 = full. Only reads state; the draw path calls this.
export function targetAlpha(frame: TargetFrame, nowMs: number, data: TargetFrameData): number {
  if (frame.targetId === null || frame.lastSeenMs === null) return 0;
  const elapsed = nowMs - frame.lastSeenMs;
  if (elapsed >= data.holdMs) return 0;
  const left = data.holdMs - elapsed;
  const fade = left < data.fadeMs ? left / data.fadeMs : 1;
  return fade * data.nameAlphaScale;
}

// Target for an order or command. Uses the same hold window, so a command sent just after aim
// leaves the enemy still reaches that enemy. Returns -1 when no target is held.
export function commandTarget(frame: TargetFrame, nowMs: number, data: TargetFrameData): number {
  if (frame.targetId === null || frame.lastSeenMs === null) return -1;
  return nowMs - frame.lastSeenMs < data.holdMs ? frame.targetId : -1;
}
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, file /tmp/hu021-ioquake-target-frame.ts (with `export {};`): exit 0.

## 5. Lands in

- TARGET `src/fight/targetFrame.ts` (new): per-frame target update from the engine's fight state (the engine owns the enemy list, range and fog/invisible rules), read by the HUD name/frame and by the order command. Parity-checklist row 14 (HUD). The client only reads it; the server must validate any order target (the donor's `gc` handler was not read).
- today: not read (current Frankendom client HUD code was not opened for this note).
- Reuse tag: rewrite-from-idea (GPL-2.0-or-later; clean-room only)
- Brief rule served: HUD and camera are client-only (the target record is an engine read, the frame is a client draw); order targets are server-validated (rule: kills and actions are server-verified).

Best transferable idea: Keep the last aimed enemy for one fixed hold window after the aim leaves it, fade the label over the final part, and let an order aimed at that enemy still resolve inside the same window.
Decision (proposed): adapt - take the hold-and-fade record and the shared window for the order command, but pick the target from the fight's enemy list with a range cap and set the window once as data, not the donor's ray from the client view.
Acceptance: A player sees the enemy's name frame stay for 1 s after the reticle leaves it, fading over the last 0.2 s; a server test sends an order 0.9 s after aim left and checks it resolves to that enemy, with the HUD turned off.

## 6. Gaps and risks

- GPL-2.0-or-later: clean-room only. The sketch is written from the mechanism.
- Defect 1, the scan runs in the draw path and only when both name cvars are on (cg_draw.c 2044 and 2047 return before the scan at 2055). So with the crosshair or the names cvar off, the timestamp is never refreshed and `CG_CrosshairPlayer` returns -1 after the hold (cg_main.c 410-411): an order has no target. Fix: move the update into the per-frame input/tick path; the draw and the command only read it.
- Defect 2, the 1000 ms window is typed twice (cg_draw.c 2058 and cg_main.c 410). Fix: one data constant read by both the label and the command.
- Defect 3, the ray has no range cap (131072 units, cg_draw.c 2009). Fix: `rangeUnits` as zone data; the fight's own range rule decides a valid target.
- Defect 4, `CG_FadeColor` treats a start time of 0 as "never" (cg_drawtools.c 332-333), so a sighting at time 0 is lost. Fix: a nullable timestamp (the sketch does this).
- Gap, the donor hides the name in third person (cg_draw.c 2050). Our world camera is third person over the shoulder, so the label must be shown there; the donor's rule is inverted for us.
- Gap, free aim only. The donor shows the name under the reticle. With MAX_ATTACKERS = 3 the frame that matters is the engine's hate target, not the aim ray; the aim pick is for lock-on and order targeting only.
- Gap, the Pit is a fixed arena (row 22). The aim ray is still a client read, so the Pit shows the frame from the same record; do not add a second target path.
- Not read: `CG_DrawStatusBar` (cg_draw.c 519-660) and the layout file `ui/hud.menu` (absent from this donor).
- The donor's `gc` order handler on the server was not read, so the server-validation claim is a requirement, not a finding.
