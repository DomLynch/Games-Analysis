# ryzom-ryzomcore (hud-ui, cell 16)

Donor: `/mnt/frankendom-donors/ryzom-ryzomcore/ryzom/client/src/interface_v3/group_in_scene_user_info.cpp` (`CGroupInSceneUserInfo::updateDynamicData`, 939-1215; helper 932-935), with constants from `/mnt/frankendom-donors/ryzom-ryzomcore/ryzom/common/src/game_share/entity_types.h` (144, 178) and `/mnt/frankendom-donors/ryzom-ryzomcore/ryzom/client/src/entity_cl.h` (75) | Licence: as read: GNU AGPL-3.0-or-later (header lines 10-12: "either version 3 of the License, or (at your option) any later version"; the repo COPYING is the AGPL v3) | C++ (Ryzom client, Lua and XML HUD layout elsewhere) | symbol `CGroupInSceneUserInfo::updateDynamicData`

Checked: `updateDynamicData` was read from 1012 to 1215, with the helper at 932-935 and the bar section at 1175-1200 read in full. Not read: 1140-1168 (focus and stamina bars, only the first lines seen) and the start of the function, 939-1011 (apart from the guild and faction lines). Callers, read: `character_cl.cpp` 6222-6232 (called inside the `showIS` block; the enclosing function was not read, so the frequency is not confirmed), `group_in_scene_user_info.cpp` 800-809 (user info, the smooth-tick data), `forage_source_cl.cpp` 308-316 (forage sources, scale and position per update). Confidence: high on the range tiers, the bar scale, the negative and dead rules and the hide branch (each read). Medium on the frame rate (not confirmed). camera_scope: not applicable (HUD). Minimap and world map were NOT covered: `group_map.cpp` (4199 lines) was not read, and "minimap" is not in the client's in-game HUD (grep hits are in `src/r2/` editor files only). Touch: no touch input in the client (grep for touch screen, touch event and multitouch returned nothing). Lock-on: no auto-target or lock-on code (grep hits were unrelated). Input buffer: none in the client input path (the one "buffer" hit is network). String table: see section 6.

## 1. Mechanism

- Per entity, per update, the client sets a set of in-scene HUD elements (name, guild, target marker, HP, SAP, STA, focus bars) from server-fed bar data. Two range rules decide what is shown, and both are measured on the same distance.
- Distance (line 1030): `getManhattanDistance` is `|dx| + |dy|` (934). Height is ignored. The distance is from the user to the entity.
- Target marker (1034-1035): the marker is active only when the entity's target slot is slot 0, the player (1034), and the distance is not over 55 m (`THRESHOLD_TARGET_ID_CLIENT_M`, 1035 and 144). Otherwise the marker is switched off.
- Bars range (1049-1050): a comment at 1049 says the bars are hidden far away "because their value is not updated by the server". Bars are shown only when the distance is under 28 m (`THRESHOLD_BARS_CLIENT_M`, 1050 and 178).
- Far branch (1209-1214): outside 28 m the left group (the bars) is switched off (1213), but only if it is currently on. There is no hysteresis: the same threshold is used to show and to hide.
- Bar values (1076-1109, HP): the bar width is `_BatLength * score / 127` (1076 and `RZ_BARS_LENGTH` 127, entity_cl.h 75), with integer division. A negative HP is turned into its absolute value and drawn in the negative colour (1081-1082). For a dead creature that is not a player or the user, a positive value is forced to 0 (1089). The width is clamped to 0 to the bar length (1109).
- Action bar (1175-1199, the user only): width is the bar length times (value - begin) / (end - begin), where value is the smoothed server tick (`UI:VARIABLES:CURRENT_SMOOTH_SERVER_TICK`, line 801), begin and end are the action start and end ticks (802-803). The clamp keeps it inside the bar; `end` is raised to `begin` if it is smaller (1186); a zero span gives 0 (1195).
- Tick: the bars are not a loop of their own. Each update is driven from outside (the callers above). Inside `updateDynamicData`, only the action bar reads a smoothed tick; the HP bar takes the server value as it is (the bar manager was not read). The comment at 1065 says the forage-source path is "updated at each frame on client (because of smooth transition code)"; that code was not read.

## 2. Key functions

- `CGroupInSceneUserInfo::updateDynamicData`: `/mnt/frankendom-donors/ryzom-ryzomcore/ryzom/client/src/interface_v3/group_in_scene_user_info.cpp` 939-1215 (range tiers 1030-1050, far branch 1209-1214, HP 1074-1111, action bar 1175-1199).
- `getManhattanDistance`: same file, 932-935 (XY Manhattan).
- `CGroupInSceneUserInfo::setLeftGroupActive`: same file, 888 (the hide and show switch; not read in full).
- Caller: `/mnt/frankendom-donors/ryzom-ryzomcore/ryzom/client/src/character_cl.cpp` 6222-6232.

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constants |
|---|---|
| A marker for the unit that targets the player reaches further than the bars | Target marker 55 m (entity_types.h 144); bars 28 m (entity_types.h 178) |
| Bars are hidden past their range because the server stops keeping them fresh | Comment 1049; no time limit, only distance |
| HP bar width scales the server score onto a fixed bar | Divisor 127 (entity_cl.h 75); width `_BatLength * score / 127` (1076) |
| Clamp the bar to its track | 0 to `_BatLength` (1109) |
| Negative HP keeps its magnitude and changes colour | Absolute value and negative colour (1081-1082) |
| A dead non-player always reads as empty | Forced 0 (1089) |
| Action progress is a fraction between two server ticks | `(value - begin) / (end - begin)` times the bar length (1186-1199) |

Defects found, with the fix for each (keep the idea, fix the defect):
1. No hysteresis on the bars range: the same 28 m threshold shows and hides the bars (1050, 1213), so a unit at the edge can flicker in and out as the player moves. Fix: show inside 28 m, hide only beyond a larger distance (a band). The sketch does this with `hideBeyond`; the 30 m value in the note is my proposal, not from the donor.
2. The bar width integer-divides before it clamps (1076, 1109). Harmless at the pixel level, but a rounding error that adds up for a long bar. Fix: floor once from floats, then clamp, as the sketch does.
3. Negative HP keeps its magnitude and shows only in colour (1081-1082). That is a display choice that a player can misread (a negative bar looks like a positive one of the same length). Fix: not needed for Frankendom, since HP does not go negative there; reject this part of the donor.

## 4. TypeScript sketch

simplified: the sketch keeps the range tiers, the XY Manhattan distance, the bar scale and clamp, the dead-unit rule, and the new band. It omits the target-slot test (the caller passes `targetsViewer`), the negative-HP colour and sign, the forage path, the name, guild and faction text, the focus and stamina bars, the action bar, and the per-frame caller. It reorders one thing: the band check happens before the bar width (the donor sets the width only inside the range branch, which is the same order); the new part is the hysteresis.

```ts
// Licence of donor: GNU AGPL-3.0-or-later. Clean-room sketch from the described mechanism, not a translation of the donor lines.
export interface BarConfig {
  targetRange: number;   // metres: the "targeting you" marker shows inside this range
  barsRange: number;     // metres: the HP bar shows only inside this range (the server keeps values fresh here)
  hideBeyond: number;    // metres: hysteresis; once shown, the bar hides only beyond this (proposed, not in donor)
  barLength: number;     // pixels at full scale
  scale: number;         // server score that maps to a full bar
}

export interface UnitSnapshot {
  dx: number;            // offset from the viewer, metres
  dy: number;
  targetsViewer: boolean;
  hp: number;
  dead: boolean;
  isPlayer: boolean;
}

export interface UnitView { targetMarker: boolean; barsShown: boolean; hpWidth: number; }

// wasShown = the previous frame's bar state, which is what makes the band hysteretic.
export function unitView(u: UnitSnapshot, cfg: BarConfig, wasShown: boolean): UnitView {
  if (cfg.hideBeyond < cfg.barsRange) throw new Error("hysteresis band is inverted");
  const dist = Math.abs(u.dx) + Math.abs(u.dy); // XY Manhattan distance, height ignored
  const targetMarker = u.targetsViewer && dist <= cfg.targetRange;
  const barsShown = wasShown ? dist <= cfg.hideBeyond : dist < cfg.barsRange;
  if (!barsShown) return { targetMarker, barsShown: false, hpWidth: 0 };
  let hp = u.hp;
  if (u.dead && !u.isPlayer) hp = 0;                  // a dead non-player always reads as empty
  const raw = Math.floor((cfg.barLength * Math.max(0, hp)) / cfg.scale);
  const hpWidth = Math.min(cfg.barLength, Math.max(0, raw)); // clamp to the track
  return { targetMarker, barsShown: true, hpWidth };
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, exit 0 (file `/tmp/ryzom-unit-bars.ts`). The sketch was not run; only the types were checked.

Best transferable idea: show an enemy's HP bar only inside a short range where the server keeps the value fresh, keep the "targeting you" marker out to a longer range, and give the bar a hysteresis band so it does not flicker at the edge.
Decision (proposed): adapt. The two-range split (marker further out than the bar) fits a many-on-one fight, where a marker for the one or few units that target the player is more useful than a bar on every unit. The donor's same-threshold show and hide is the defect; the band fixes it.
Acceptance: in a fight, an enemy inside the bar range shows its HP bar; walking the player back and forth across the edge does not flicker the bar (it shows until the enemy is beyond the band); a unit that targets the player shows the marker out to the marker range; a unit beyond the bar range shows no HP value at all. A unit test asserts the band and the marker range.

Reuse tag: rewrite-from-idea (AGPL-3.0-or-later; clean-room only, shape only)
Brief rule served: the client never invents a value (the bar shows only what the server sent, and nothing beyond its range); one engine (the HUD is client-only); a per-viewer rule (the marker is about this player)

## 5. Lands in

- TARGET `src/fight/hud-unit-bars.ts` (new, client-only view model for enemy HP bars and the "targeting you" marker). Parity-checklist row 14 (HUD).
- Reuse tag: rewrite-from-idea (AGPL-3.0-or-later; clean-room only, shape only)
- Brief rule served: as above

## 6. Gaps and risks

- The donor's bar values come from the server through the bar manager (`CBarManager::getBarsByEntityId`, line 1059; the manager itself was not read). Frankendom must send HP only from the server and must hide a bar whose last server value is older than the server's interest range. The donor has range only, no time limit; add a time limit (not in donor) if range alone is not enough.
- A marker for "targets you" depends on the server's target slot, which the donor reads with a "no lag" accessor (1034, `getTargetSlotNoLag`; not read). For a many-on-one fight the marker set is bounded by the engine's attacker cap (MAX_ATTACKERS = 3), so the client should draw at most three markers.
- Ranges in the donor are for an open world with 55 m and 28 m. A fight arena is smaller. The two ranges must be data (zone data) if an arena wants different values; the sketch takes them as config.
- Negative HP and the forage-source path do not transfer (Frankendom has no negative HP and no forage). Do not port them.
- Also seen in the hud-ui topic (not part of the bars mechanism):
  - Action bar (1175-1199, user only): the bar fills as the smoothed server tick moves between the action's start and end ticks. That is a clean way to show a cast or a windup on the server clock instead of the client clock. Read in full; a candidate for a windup bar in the fight HUD, and it belongs to the server-tick topic as well.
  - Compass blink (`group_compas.cpp` 239-243 and 352-377, read in part; constant `group_compas.h` 36 = 0.3 s): when the selected target changes the compass colour blends toward a new-target colour and back over 0.3 s, a triangle wave (ramp up over the first half, down over the second; 369, 373, 375). Callers at 997 and 1032 were seen by grep, not read. A cheap target-change cue for the target frame.
  - String table: the client's UI strings are not in this donor. The HUD asks for them by key (for example `uittForageContent` in `client/data/gamedev/interfaces_v3/widgets.xml`, and `CI18N::get` in code), but the table itself is not in the box. `ryzom/tools/translation/languages.txt` lists 6 language codes (wk, fr, en, de, ru, es), one per line, and is the only language list. `common/data_common/r2/r2_texts.lua` (164 lines) is the R2 scripted-text feature, not the HUD. The grammar and the key count of the UI table could not be checked.
