# veloren-veloren (input-touch-controls, cell 1)

Donor: `/mnt/frankendom-donors/veloren-veloren/voxygen/src/window.rs` (input path), with `voxygen/src/settings/controller.rs`, `voxygen/src/session/mod.rs`, `voxygen/src/key_state.rs`, `voxygen/src/hud/mod.rs`, `voxygen/src/settings/gameplay.rs` | Licence: GPL-3.0 (root LICENSE file: "GNU GENERAL PUBLIC LICENSE Version 3, 29 June 2007") | Rust | symbols `apply_axis_deadzone`, `map_controller_input`, `should_auto_zoom_lock`, `PressBehavior::update`, `dir_vec`

Checked: Read in full: `settings/controller.rs` 145-180 (deadzones), 950-985 (defaults); `window.rs` 560-720 (axis and button event path, mouse emulation) and 1326-1420 (chord layer lookup); `session/mod.rs` 200-230, 505-545, 862-975 (auto-walk stop), 1220-1236 (auto-walk toggle), 1414-1507 (move vector and aim ray), 1547-1586 (look direction, auto-camera steer); `hud/mod.rs` 831-846; `key_state.rs` 40-51; `scene/camera.rs` 531-534. Confidence: high on the input path (deadzone, chord layers, press toggle, auto-walk cancel). Medium on the auto-camera and aim block: the enclosing branch conditions around 1550-1571 were read in part, and how `inputs_state` is filled each frame was not read. camera_scope: "world camera" (the aim ray is third-person only; the auto-camera steer applies in ThirdPerson and FirstPerson). Not read: client/server prediction and lag; any touch input (the grep for Touch found only UI-layer plumbing in `voxygen/src/ui/`); landscape or portrait handling (not searched). Lock-on: grep for lock_on, lockon, target_lock and auto_target found no lock-on target selection (the hits were in render and bot files, not read in detail).

Best transferable idea: Run every analog stick through one radial deadzone rescale and resolve every button through "chord entries first (either modifier order), then the plain button", so a phone virtual pad and a gamepad share one binding table.

Decision (proposed): adapt - take the deadzone rescale and the two-order chord lookup as the one intake for virtual pads and gamepad; drop the physical trigger names and the remap UI, and cap held modifiers at two. Why: a virtual stick needs a dead radius and a rescale or it jitters at the edge, and phone gesture specials need the same "hold a pad, then tap" lookup.
Acceptance: On a 375-wide phone, pushing a virtual stick to 60% of its radius moves the character at 50% speed (applyAxisDeadzone(0.6) = 0.5), and a server-free unit test asserts that holding pad A then B and holding B then A resolve the same action.

## 1. Mechanism

Order of operations for one input event (client side, in `window.rs`):

- (a) Axis: the AxisChanged arm (window.rs 572) first flips the value if the axis is in `inverted_axes` (573), then runs `controller.apply_axis_deadzone` (581). The deadzone is the radial-style rescale in controller.rs 152-165: if |x| <= threshold the output is 0; otherwise output = (|x| - threshold) / (1 - threshold) * sign(x). Threshold defaults to 0.2 (controller.rs 153) unless a per-axis value is set. A threshold of 0 passes the value through; a threshold of 1 or more kills the axis.
- (b) If the post-deadzone value is above 0.0001, `last_input` is set to Controller (window.rs 584-586). This is how the HUD decides which button icons to show.
- (c) In game (cursor grabbed): the axis is looked up in `inverse_game_axis_map`. MovementX and MovementY become AnalogGameInput. CameraX = value * pan_sensitivity / 100 (window.rs 608-609); CameraY = -value * pan_sensitivity * invert / 100 (window.rs 622-624). In menus the same axis feeds menu move or scroll events with no sensitivity (the code has a TODO saying so).
- (d) Buttons: `handle_buttons` sets last_input to Controller, then pushes the button onto the modifier list if it is one of `modifier_buttons` (window.rs 481-493; default triggers RightTrigger and LeftTrigger, controller.rs 969-972), or removes it on release. Then `map_controller_input` decides what the press means.
- (e) `map_controller_input`, remap mode first. Otherwise, with the menu closed (window.rs 1382-1394): build two LayerEntry keys from the held modifiers, one in press order and one swapped (1366-1368); check layer entries with the first key (1384), then the swapped key (1388); if neither matches, use the plain button map (1394). With the menu open, menu inputs are checked first.
- (f) Per tick (session): `key_state.dir_vec()` builds the move vector. Keyboard: x = right - left, y = up (or auto-walk) - down, normalised with try_normalized (key_state.rs 40-47). Analog: the analog matrix times speed_mul (key_state.rs 50-51). Then move_dir = walk_right * axis_right + walk_forward * axis_up, relative to the walk direction, not the camera pitch (session/mod.rs 1586).
- (g) Press behaviour: `PressBehavior::update` flips the flag on key press in Toggle mode and copies the key state in Hold mode (hud/mod.rs 832-846). Auto-walk uses Toggle by default (gameplay.rs 40). With `stop_auto_walk_on_input` on (default, gameplay.rs 44), auto-walk is cancelled by Respawn (session 871-873), Sit, Crawl, Dance, Sneak, MoveForward, MoveBack, MoveLeft, MoveRight and Glide (session 904-968; the MoveForward case is at 940). Jump is not in that list (grep result; the Jump branch at 879 was not read line by line).
- (h) Zoom lock: the setting `zoom_lock` is off by default (gameplay.rs 47). With `zoom_lock_behavior` Auto (default, gameplay.rs 43), the flag is set each tick to `zoom_lock_enabled && should_auto_zoom_lock()` (session 222). `should_auto_zoom_lock` returns true when any input in its list is held: Primary, Secondary, Block, all movement, Jump, Roll, Sneak, auto-walk, weapon slots and a few others (session 511-543). While the flag is on, Zoom events are ignored and a reminder is shown (session 1360).
- (i) Aim ray: if the player is aiming (is_aiming), holds a ranged tool (Bow, Staff, Sceptre, Throwable, or a Throw character state), and the camera is ThirdPerson (session 1481-1483): ray_start = camera focus point (1489), forward 1000 units; the aim point is the nearer of the first entity hit and the first solid terrain hit (1490-1507). look_dir = aim point minus (player position plus projectile body offsets) (1547). Otherwise look_dir = camera direction plus a small offset.
- (j) Auto-camera (setting `auto_camera`, session 1556): while input_vec is non-zero in ThirdPerson or FirstPerson, yaw += input.x * (3.0 - input.y * 1.5 * (1.5 if aiming)) * dt (session 1568), and the pitch-like component is set to PI * 0.1, or PI * 0.015 when aiming (1570). The camera is set with `set_orientation_instant` (camera.rs 531-533), which copies the target to the current orientation with no smoothing.

Tick: the move and look vectors are built in the per-frame input block of the session before `self.tick(global_state.clock.game_dt(), ...)` runs (session 1414-1625; the exact enclosing structure was read in part). The auto-camera steer multiplies by dt, so its rate is per second, not per frame.

## 2. Key functions

- `apply_axis_deadzone`: `/mnt/frankendom-donors/veloren-veloren/voxygen/src/settings/controller.rs` 152-165 (rescale, default threshold 0.2 at 153).
- `apply_button_deadzone`: same file 167-179 (unsigned rescale, default 0.2 at 168).
- `window.rs` AxisChanged arm: `/mnt/frankendom-donors/veloren-veloren/voxygen/src/window.rs` 572 onward (inversion at 573, deadzone at 581, controller-last-input at 585, game versus menu split, CameraX and CameraY at 608 and 622).
- `handle_buttons` and `map_controller_input`: `/mnt/frankendom-donors/veloren-veloren/voxygen/src/window.rs` 465 onward and 1326-1420 (modifier push at 483; chord lookup at 1366-1394).
- `PressBehavior::update`: `/mnt/frankendom-donors/veloren-veloren/voxygen/src/hud/mod.rs` 831-846.
- `should_auto_zoom_lock` and `maybe_auto_zoom_lock`: `/mnt/frankendom-donors/veloren-veloren/voxygen/src/session/mod.rs` 214-226 and 511-545.
- Aim ray and look direction: `/mnt/frankendom-donors/veloren-veloren/voxygen/src/session/mod.rs` 1481-1507 and 1547.
- Auto-camera steer: `/mnt/frankendom-donors/veloren-veloren/voxygen/src/session/mod.rs` 1556-1571.
- `dir_vec`: `/mnt/frankendom-donors/veloren-veloren/voxygen/src/key_state.rs` 40-51.

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constants (theirs) |
|---|---|
| Radial deadzone rescale: 0 inside the threshold, linear 0..1 outside, sign kept | Threshold 0.2 for axes (controller.rs 153) and for buttons (168). Example: input 0.6 gives (0.6 - 0.2) / 0.8 = 0.5. |
| Chord lookup: button plus up to two modifiers, either order, then plain button | Two modifier slots; default modifiers are the two triggers (controller.rs 969-972); lookup at window.rs 1384-1394. |
| Press behaviour per action: Toggle flips on press, Hold copies state | Auto-walk default Toggle (gameplay.rs 40); Toggle flip at hud/mod.rs 836. |
| Movement cancels auto-walk | Setting on by default (gameplay.rs 44); MoveForward case at session 940. |
| Freeze zoom while fight or move inputs are held | Setting off by default (gameplay.rs 47); list at session 515-543. |
| Aim at the crosshair hit point, not the bare camera direction | Ray length 1000 units (session 1490); only ThirdPerson plus ranged (1483). |
| Auto-camera yaw rate, forward slower than backward | Base 3.0, forward term 1.5, aiming factor 1.5 (session 1568); rates are per second at full input (camera units assumed radians; not confirmed). |
| Pitch constant during movement | PI * 0.1 normal, PI * 0.015 aiming (session 1570). |
| Sensitivity scales | Gamepad pan: controller.pan_sensitivity default 10 (controller.rs 973), divided by 100 (window.rs 608-609). Mouse pan: gameplay pan_sensitivity default 100 (gameplay.rs 32), divided by 100 (window.rs 735). Menu cursor emulation: 12 (controller.rs 977) times the axis vector per call (window.rs 713). |

## 4. TypeScript sketch

simplified: keeps the radial deadzone rescale (threshold default 0.2, the same branches for "dead", "pass-through" and "kill") and the two-order chord lookup with chord-before-plain priority. It omits the remap mode, the menu-open branch, the modifier push and remove bookkeeping (window.rs 481-493), the unsigned button deadzone (the button rescale in the donor does not use the sign), the per-input threshold map, the inverted-axis flag and the auto-walk, zoom-lock and aim-ray logic. The chord lookup keys are strings here, not LayerEntry structs. Typechecked on the VPS (`npx -p typescript tsc --noEmit --strict --target es2020`): exit 0.

```ts
// Licence: GPL-3.0 (donor, Veloren LICENSE). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room

// Radial deadzone for a signed analog axis: inside the threshold the output is 0,
// outside it the remaining travel is rescaled to 0..1 so the output does not jump at the edge.
export function applyAxisDeadzone(input: number, threshold = 0.2): number {
  const abs = Math.abs(input);
  if (abs <= threshold || threshold >= 1) return 0;
  if (threshold <= 0) return input;
  return ((abs - threshold) / (1 - threshold)) * Math.sign(input);
}

// Chord lookup: one button plus up to two held modifiers. A chord matches in either
// modifier order (LB+RB == RB+LB). Chord entries win over the plain button entry.
export function resolveBinding(
  button: string,
  heldModifiers: string[],               // modifiers in the order they were pressed
  chords: Map<string, string>,           // key "button|mod1|mod2" -> action
  plain: Map<string, string>,            // button -> action
): string | undefined {
  const m0 = heldModifiers[0] ?? "";
  const m1 = heldModifiers[1] ?? "";
  const first = chords.get(`${button}|${m0}|${m1}`);
  if (first !== undefined) return first;
  const swapped = chords.get(`${button}|${m1}|${m0}`);
  if (swapped !== undefined) return swapped;
  return plain.get(button);
}

export {};
```

## 5. Lands in

- TARGET `src/fight/input.ts` (new module: the one controls intake for virtual pads and gamepad; the touch and pad UIs are clients). Parity-checklist row 5 (controls/input). The donor's deadzone sits on the intake edge, and the chord table feeds the same action names the duel step reads.
- Reuse tag: rewrite-from-idea (GPL-3.0; clean-room only)
- Brief rule served: one engine (controls intake is engine code; touch and pad are clients); rules 7-9 n/a

## 6. Gaps and risks

- GPL-3.0: clean-room only. The sketch is written from the mechanism. The donor's lines are not copied.
- Server-verified kills: the donor's aim ray runs on the client and its result goes out as `look_dir` (session 1547). Frankendom must not trust that point. The server has to check the aim direction against range and line of sight, or re-cast it. Not read: whether the Veloren server checks `look_dir`.
- Phone: the donor has no touch controls. A chord on a phone is two held on-screen pads. The rule "at most two held modifiers" caps the table and keeps 375-wide layouts readable; that is an assumption, not a donor fact.
- Defect (keep the idea): menu cursor emulation is not frame-rate independent (window.rs 711 TODO; the offset is added per call at 713). Fix: multiply the per-frame offset by the frame dt before adding it.
- Defect (keep the idea): the gamepad camera and the mouse camera use two different sensitivity fields with different scales (controller.rs 973 default 10; gameplay.rs 32 default 100). Fix: one sensitivity data field per device class, with one scale.
- Defect (keep the idea): auto-camera pitch is written as a constant each tick and copied with no smoothing (session 1570; camera.rs 531-533), so the camera snaps. Fix: ease toward the target pitch with a frame-rate independent factor, for example 1 - exp(-k * dt).
- No input buffer: a grep for "buffer" in common/src, common/systems and voxygen/src/session found nothing about input queues (the hits were chunks, index buffers, poise and audio). Frankendom's fight input buffer has no donor shape here.
- Gamepad sticks and triggers share one deadzone path, but the button deadzone is unsigned and the axis deadzone is signed. Frankendom's virtual pad should use the signed form.
- Frankendom rulings: the zoom-lock list (session 515-543) freezes the camera while fight inputs are held. That shape is client-only; it does not touch the duel step. Keep the freeze out of the server.

Reuse tag: rewrite-from-idea (GPL-3.0; clean-room only)
Brief rule served: one engine (controls intake is engine code; touch and pad are clients); rules 7-9 n/a
