# gawric-Unity-Client-for-L2J (hud-ui, cell 1)

Donor: `/mnt/frankendom-donors/gawric-Unity-Client-for-L2J/l2-unity/Assets/Scripts/Combat/TargetManager.cs` | Licence: Apache License, Version 2.0 (LICENSE at the donor root, header read: "Version 2.0, January 2004"; permissive, code may be adapted) | C# (Unity) | symbol `TargetManager.NextTarget`

Checked: The list hint `Resources/Data/UI/_Elements/Login/ServerList/ServerListWindow.uxml` is the login server-list window (36 lines), not the HUD, so it was not used. The real target path was found by grep on target, lock, next-target and visibility words. Read in full: `Combat/TargetManager.cs` (303 lines), `Game/Action/NextTargetAction.cs`, `Networking/.../Combat/MyTargetSelectedIncoming.cs`, `UI/Game/TargetWindow.cs`. Read in part: `Controller/ClickManager.cs` 185-210, `Game/Action/AttackAction.cs` 28-53, `Camera/CameraController.cs` 152-190 (`IsObjectVisible` in full; the class head and the collision detector helper it calls were not read). Confidence: high on the order of operations and the numbers of the cycle; medium on the visibility gate. Not read: the Inspector values for `_maximumTargetDistance` and `_entityMask` (scene file), `CameraController._collisionDetector.GetCameraViewPortPoints`, `TargetData.GetColorName`, the server side of MyTargetSelected, and the project's fixed-step setting. Camera scope: not a camera cell (the visibility test uses the camera; cell is hud-ui). Also read but not written up as a note: the minimap and world map (`UI/Game/Map/*.cs`, `Utils/MapUtils.cs`); see section 6.

## 1. Mechanism

Client-side tab-target with two states (selected, then engaged), fed partly by server packets.

- Every FixedUpdate, in this order: (a) `VerifyNextTargetIndex()` runs on the list from the previous step (line 70); (b) `Physics.SphereCastAll` at the player position with radius `_maximumTargetDistance` (15 by default, line 14) collects colliders on `_entityMask` (line 72); (c) `GetVisibleEntities()` keeps those within the range (line 98-100) and that pass `CameraController.IsObjectVisible` (line 104), then sorts them nearest first by distance from the player (line 90).
- Tab press: `NextTargetAction` ignores the press when the player is dead (lines 8-11), otherwise calls `NextTarget()`. `GetNextTargetIndex()` starts at the stored cursor, wraps to 0 if it is past the end, and if the entry at the cursor is the current target it steps once more (lines 150-153); it wraps again if needed. `NextTarget()` stores that cursor and selects the entry at it (lines 165-167).
- Cursor verification (lines 107-139): if the cursor is past the end, reset to 0. If the current target is no longer visible or in range, reset to 0. If the current target sits at a list position other than the cursor, reset to 0.
- Selecting a different target clears the attack target (lines 212-215). A second click or hotkey on the already selected monster sets the attack target: `ClickManager.OnClickOnEntity` checks same id, not dead, and `MonsterEntity` (lines 195-203) then calls `SetAttackTarget()` (line 202); `AttackAction` does the same for the melee hotkey (lines 32-46). The comment at line 199 says a new select is "blue" until the attack target is set; the comment in AttackAction says "red while closing distance". The hex colour values are passed in by callers and were not read.
- Server path: a MyTargetSelected packet with an object id and a colour (`MyTargetSelectedIncoming.cs` lines 10-18). For the player's own id it selects the player (white). For another id it calls `NextTargetById`, which scans with radius 50 (line 172), selects every collider whose parent has the matching identity id, and uses the packet's colour (lines 176-184). It does not check the visibility gate or the range of 15.
- Visibility gate (`CameraController.cs` 166-189): true when at least one camera clip point has a clear `Physics.Linecast` to the target's head (feet plus `_resolvedPlayerHeight`, line 167), AND the target's feet are inside the viewport on x and y (0 to 1) with viewport z of at least -0.2 (line 189).
- Tick: FixedUpdate drives the list; Update refreshes the target's distance each frame (line 294) and clears the target if there is none (line 300).

## 2. Key functions

- `TargetManager.FixedUpdate` 56-74: verify, scan, rebuild the list.
- `TargetManager.GetVisibleEntities` 76-94 and `IsTransformVisible` 96-105: range plus visibility, nearest first.
- `TargetManager.VerifyNextTargetIndex` 107-139: cursor validity and reset rules.
- `TargetManager.GetNextTargetIndex` 141-161 and `NextTarget` 163-168: the tab step.
- `TargetManager.NextTargetById` 170-187: server-driven select by identity id.
- `TargetManager.SetTarget` 191-222: the attack-state drop at 212-215.
- `ClickManager.OnClickOnEntity` 186-208: the second-press engage.
- `CameraController.IsObjectVisible` 152-190: the line-of-sight and viewport test.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Candidate set = in range AND visible, nearest first | Range 15 units (theirs, TargetManager.cs:14; code default, Inspector not read) |
| Tab steps the list, skips the current target, wraps | None |
| Re-check the cursor every step; reset to 0 on loss or reorder | None |
| Second press on the selected monster engages it (not NPCs, not dead) | Engage rule is the monster type check (theirs, ClickManager.cs:200) |
| Server-driven select by id | Scan radius 50 units (theirs, TargetManager.cs:172), not the 15 of the tab |
| Visibility: any clear line from camera clip points | Viewport z allowance -0.2 (theirs, CameraController.cs:189) |

## 4. TypeScript sketch

simplified: the sketch rebuilds the candidate list and then checks the cursor in one step (the donor checks the previous step's list first, then rebuilds, lines 70-73). It omits the sphere scan and the camera-visibility gate (replaced by a `visible` flag on each candidate), the server id path (`NextTargetById`), colours, the target distance refresh in Update, the server cancel packet in `ClearTarget`, and the dead-state guard on the tab action in `NextTargetAction` (the sketch's `engage` takes an `isDead` argument, but nothing in the sketch checks the player's own state). The empty-list case returns null instead of throwing (the donor indexes an empty list at lines 150 and 167). Range is the donor default.

```ts
// Licence: Apache-2.0 (donor LICENSE). Re-expressed from the logic read in Combat/TargetManager.cs; not a line copy.
export type Cand = { id: number; dist: number; visible: boolean };

// Donor default _maximumTargetDistance = 15f (Inspector value not read). Units.
export const RANGE = 15;

export interface TabTarget {
  candidates: Cand[];      // nearest first; in range and visible
  index: number;           // cursor into candidates
  current: number | null;  // selected target id
  engaged: number | null;  // attack target id (second state)
}

// Rebuild the list, then keep the cursor valid.
export function refresh(st: TabTarget, all: Cand[]): void {
  st.candidates = all
    .filter(c => c.dist <= RANGE && c.visible)
    .sort((a, b) => a.dist - b.dist);
  if (st.index >= st.candidates.length) st.index = 0;
  if (st.current !== null) {
    const pos = st.candidates.findIndex(c => c.id === st.current);
    if (pos < 0 || pos !== st.index) st.index = 0;
  }
}

// Tab: step past the current target and wrap. Empty list = no-op.
export function nextTarget(st: TabTarget): number | null {
  if (st.candidates.length === 0) return null;
  let i = st.index >= st.candidates.length ? 0 : st.index;
  if (st.current !== null && st.candidates[i].id === st.current) i++;
  if (i >= st.candidates.length) i = 0;
  st.index = i;
  select(st, st.candidates[i].id);
  return st.current;
}

// Selecting a different target drops the attack state.
export function select(st: TabTarget, id: number): void {
  if (st.current !== id) st.engaged = null;
  st.current = id;
}

// Second press on the selected monster engages it. NPCs and dead targets never engage.
export function engage(st: TabTarget, isMonster: boolean, isDead: boolean): void {
  if (st.current !== null && isMonster && !isDead) st.engaged = st.current;
}
export {};
```

Sketch check: copied to the VPS as `/tmp/HU018-gawric-tab-target.ts` and run with `npx -p typescript tsc --noEmit --strict --target es2020`; exit 0.

## 5. Lands in

- TARGET `src/fight/targeting.ts` (new module): the engine owns the engaged state (one attack target per player, server-verified). The tab cursor and the visibility filter stay in the client HUD.
- Parity row 14 (HUD: target frame and lock-on).
- today: Frankendom's current target code was not read in this pass.
- Reuse tag: rewrite-from-idea (Apache-2.0, permissive; the sketch is a re-expression, not a copy).
- Brief rule served: the one-engine ruling (engage is a state change; the cursor is HUD); the server-verified engage ruling.

## 6. Gaps and risks

Donor defects, idea kept, each fixed in the sketch:

1. Empty list throws. `GetNextTargetIndex` (line 150) and `NextTarget` (line 167) index `_visibleEntities` with a target set but Count 0. Fix: return null when the candidate list is empty.
2. Stale cursor check. FixedUpdate runs `VerifyNextTargetIndex()` (line 70) before rebuilding the list (line 73), so the cursor is checked against the previous step. Fix: rebuild, then verify.
3. Non-short-circuit `&` at line 180 (`_entity != null & _entity.Identity.Id == id`) evaluates the identity read even when `_entity` is null. Fix: `&&`.
4. Hard-coded radius 50 at line 172 and a fixed `_areaMask = 8192` (line 16) sit next to the tab's 15. Fix: one data field per radius.
5. `NextTargetById` calls `SetTarget` for every match with no break (lines 174-186), so the last match wins. Fix: take the first match by id.

Rulings:

- Visibility is camera-based (camera clip points, Linecast, viewport) and client-only. It is fine for choosing what the HUD cycles through, but kills and engage must not depend on it. The server must check range and line of sight on its own rules.
- The donor's click also sends `ClickActionCommand` to the server (ClickManager 205-207), and the server selects by id. The client does not verify the attack. This matches "engage is a state change", but the server-side range check was not read.
- MAX_ATTACKERS = 3: the donor has one attack target for the local player and no slot count. The choice among several enemies in a many-on-one fight is not in this donor.
- Zones as data: 15 (tab range) and 50 (id scan) are code constants. Keep the tab range as an engine constant; if zones need different reach, make it zone data.
- Input buffer and touch: a grep for input buffer or skill queue found nothing in the donor (the one hit is a crypto file). Touch-specific hits are in UI drag and render files and were not read. Nothing here for touch UX.
- Target frame (`UI/Game/TargetWindow.cs`, read in full): thin. HP bar width is the background width times the clamped HP ratio (lines 96-110); the HP bar can be hidden per identity flag (line 112); the window centres once at build (line 74) and is not re-centred on resize. Line 5 has `using UnityEditor;` in a runtime script; this is expected to fail a player build (not built here). Not fixed here.
- Minimap and world map (not written up as a note; read in full): world-to-map normalisation with clamp (`Utils/MapUtils.cs` 11-45), marker placement (47-90), pan-to-marker clamped to the map edges (96-123), drag pan clamped to the map bounds (`UI/Game/Map/MapPanner.cs` 138-161). The marker heading equals camera yaw plus 90, normalised to -180..180 (`MapMarkerFollowCamera.cs` 23-25, 48-59), applied from a camera pre-render callback (`MapEventTurnCamera.cs` 16-21). Defects: `MapMarkerFollowCamera.TurnUpdate` reads `targetCamera.transform` (line 23) before its null check (line 27); `MapPanner` registers PointerDown twice (lines 43-47 and 63). The world corners and map size are constants in `MapPanner.cs` 15-21, which is a zones-as-data gap. Its best idea for the camera owner: the minimap heading follows the camera yaw, not the character facing. Worth a separate note.
- String table (localisation fold-in). `StreamingAssets/Data/Meta/SysString_Classic-eu.txt`: 3,945 entries, one per line, four tab-separated fields (begin marker, `stringID=` integer, `string=[...]`, end marker). IDs are unique. Text is wrapped in square brackets, and `DatUtils.CleanupString` removes every `[` and `]` in the value (`DatUtils.cs` 10-12). 7 texts contain a second `=`, which the loader truncates (`SysStringTable.cs` lines 55-57 split on every `=`). 4 texts carry placeholders (numbered braces, `%s`/`%d`, or `$` tokens). 22 texts contain a literal backslash-n. 13 texts contain non-ASCII characters. No text is empty. Consumers: the table is loaded at start (`GameManager.cs` line 96) and registered in DI (`AppLifetimeScope.cs` line 63); no code in this donor reads a value from it, because the class has no lookup method. Treat the table as loaded but unused in this donor. The language of the non-ASCII lines was not read.
- Confidence: the target cycle is read end to end. The visibility gate depends on an unread helper (the collision detector), so its exact clip-point set is not confirmed.

Best transferable idea: Tab-cycle the nearest visible enemies in range, skipping the current one and wrapping, and keep "selected" and "engaged" as two separate states so a second press on a monster is the attack.

Decision (proposed): adapt — the cursor and the two-state split fit a fast duel and a many-on-one pack; the donor's visibility gate is camera-based and client-only, so it may pick the HUD target but never decide an engage.
Acceptance: Player: with three visible monsters at 4, 7 and 12 units, each Tab press selects the next nearest (4, 7, 12, then 4); a monster behind a wall is skipped; with none in range Tab does nothing and raises no error. Server test: an engage request for a target more than 15 units away, or for a target that is not the player's current selection, is rejected.

Reuse tag: rewrite-from-idea (Apache-2.0, permissive).
Brief rule served: one-engine ruling (engage is a state change; the client cursor is HUD only); server-verified engage.
