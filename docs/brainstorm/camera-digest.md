# Digest: camera (55 notes)

### OpenXcom-OpenXcom (copyleft, scope=world, verdict=STRONG, depth=thin)
note: /private/tmp/p2/wave2-haiku/batch3/QC001/out/camera/OpenXcom-OpenXcom.deep.md
best_idea: A follow camera that stays still while a shot is in frame, latches onto it once it leaves the view, and releases at impact.
decision: adapt - Keep the shot-follow shape (still while in frame, follow once it leaves, release at impact) but ease instead of the donor's hard lock; reject the isometric edge scroll, paging jump and fixed-step scroll for a third-person camera.
acceptance: In an open zone a fired or thrown shot leaves the camera still while on screen; once it leaves the frame the camera eases it back toward centre (about 0.12 s half-life) and releases at impact. Client browser test only.
tags: follow-point,new:latch-follow,fixed-step
data_fields: ['edge_band_px', 'corner_zone_px', 'diagonal_step_ratio', 'scroll_interval_ms', 'scroll_step_px', 'latch_margin_px', 'lock_target_ratio', 'recentre_half_life_ms', 'level_shift_ratio', 'map_clamp_margin_tiles', 'draw_fps_cap']
gaps/risks(excerpt): - GPL-3.0-or-later: clean-room only. The sketch is written from the mechanism, not from donor lines.
- Nothing here transfers to an over-the-shoulder camera: no shoulder offset, distance, pitch or yaw limits, wall pull-in, lock-on framing, FOV or zoom change, or shake. I read the whole Camera class and none of these are in it. For the owner's world camera, only the shape of the projectile follow transfers.
- "Smooth" is a misnomer. The engaged state is a hard lock applied on each draw (Map.cpp 566-569). Do not copy the lock. The damping in the sketch is ours and must be tuned as client data.
- The scroll is a fixed pixel step per timer tick with no catch-up after a stall (Timer.cpp 125-135).
checker: -

### ValveSoftware-halflife (restricted, scope=world, verdict=STRONG, depth=full)
note: /private/tmp/p2/wave2-haiku/batch3/QC002/out/camera/ValveSoftware-halflife.deep.md
best_idea: Keep the camera as data (ideal yaw, pitch and distance per zone) that player input writes and a per-frame ease chases toward ideal plus the character's facing, with a yaw clamp that keeps the camera out of the character's front and a zoom-in reset to directly behind.
decision: adapt - It is the only real third-person mechanism in this donor set and its ideal-plus-ease split with a rear-half clamp is what the world camera lacks; but it orbits to look at the character rather than framing over the shoulder, has no wall pull-in (its collision code is compiled out), and steps per frame, so Frankendom must add a shoulder offset, a real pull-in and dt-based easing before adopting it.
acceptance: In a zone with the default preset, a 90-degree turn of the character is trailed by the camera and settled to within 1 degree in under half a second, and releasing the look key leaves the camera where the player left it (client test).
tags: follow-point,new:eased-angle-follow,new:persistent-manual-offset,new:orbit-look-at,new:zoom-reset-to-behind
data_fields: ['ideal_yaw_offset', 'ideal_pitch_offset', 'ideal_distance', 'min_distance', 'max_distance', 'mouse_yaw_limit', 'pitch_limit', 'ease_per_tick', 'angle_snap_window', 'distance_snap_window', 'keyboard_orbit_step', 'keyboard_zoom_step', 'mouse_orbit_gain']
gaps/risks(excerpt): - It orbits and looks at the character; it does not frame over the shoulder. The camera is placed on the offset circle and aimed back at the eye point (view.cpp:625-633 and 791-793), so the character is always centred. A true over-the-shoulder rig (translate sideways from the character, then look along the view) is not in this code. Setting the ideal yaw to a small value gives a rear-quarter orbit, not a shoulder.
- No wall protection. The only collision idea is the `cam_contain` branch (186-192, 338-359, 391-410), which is inside `#ifdef LATER`; LATER is not defined in cl_dll, common or engine, so the shipped camera passes through walls. The compiled-out rule refuses a blocked move and keep
checker: -

### afritz1-OpenTESArena (permissive, scope=world, verdict=STRONG, depth=full)
note: /private/tmp/p2/wave2-haiku/batch3/QC002/out/camera/afritz1-OpenTESArena.deep.md
best_idea: Derive the camera from the character's post-physics position in the same tick, with turn input applied before the physics step and pitch clamped to a player-set limit, and normalise mouse look by the smaller screen side.
decision: adapt - Frankendom's world camera needs the same update order and aspect-independent look, but this donor is first-person with no shoulder offset or collision pull-in, so the over-the-shoulder rig must be designed on top of these rules; the Pit camera stays frozen and does not need it.
acceptance: A client test asserts that after one physics step the camera eye equals the collider centre plus the eye offset (within 1e-6), that pitch never exceeds the limit, and that a mouse move of the same pixel length gives the same yaw on a 1600x900 and a 1200x900 window.
tags: follow-point,new:post-physics-camera,new:aspect-normalised-look
data_fields: ['look_sensitivity_h', 'look_sensitivity_v', 'pitch_limit', 'swim_turn_scale', 'eye_offset_above_collider_centre', 'collider_radius', 'vertical_fov']
gaps/risks(excerpt): - No third-person camera. The donor has no shoulder offset, no collision pull-in for the camera, no lock-on, no framing for several enemies, no combat FOV or zoom pulse, no shake and no recentring. The owner's complaint about the over-the-shoulder view is not answered by this donor; it gives only the update order and the look rules.
- The eye sits inside the collider. Walls stop the character (collider radius 0.20, Player.h:33), not the camera. A third-person camera needs its own pull-in ray cast, which is not in the donor.
- Modern mouse look is per frame and not scaled by `dt` (PlayerLogic.cpp:1014); classic keyboard turn is scaled by `dt` (PlayerLogic.cpp:989). Frankendom should pick one 
checker: Verified loop order (turn 880-889, accelerate 915, physics 938-941, eye 953-959, render re-init 1027-1031), rotateX fmod / rotateY clamp, eye offset 29.5/128 from Player.h 29-31 and ArenaPlayerUtils 15-16, collider radius 0.20, min-side mouse normalisation 1010-1014, turningScale 1 / 2/3, defaults sensitivity 2.5 / pitch limit 90 / FOV 60, zoom 1/tan(fov/2), MIT licence.

### gawric-Unity-Client-for-L2J (permissive, scope=world, verdict=STRONG, depth=full)
note: /private/tmp/p2/wave2-haiku/batch3/QC002/out/camera/gawric-Unity-Client-for-L2J.deep.md
best_idea: Pull the camera in on a sphere cast from the look-at point toward the desired camera spot, and lerp the look-at point rather than the camera, so the camera follows the character with lag but never sits inside level geometry.
decision: adapt - It is the only donor here with a real collision pull-in and a smoothed look-at, and Apache 2.0 allows adaptation with the notice kept; but it snaps the distance, has no shoulder offset (its offset is world-space and zero), never follows the character's facing, and uses a fixed 90-degree horizontal FOV that becomes very wide on a portrait phone, so Frankendom must ease the pull-in, add a camera-space shoulder offset, add auto-follow, and cap the vertical FOV.
acceptance: With a wall about 1 m behind the character, a client test asserts that the camera distance is no more than the wall distance and no less than 0.05 m, and that the camera distance eases back out (no snap) when the wall is removed; a 375x812 portrait window keeps the vertical FOV under a set cap.
tags: follow-point,new:orbit-look-at,new:sphere-cast-pull-in,new:lerped-look-at,new:fixed-horizontal-fov
data_fields: ['pull_in_radius', 'pull_in_extra_length', 'pull_in_min_distance', 'follow_distance_default', 'zoom_min', 'zoom_max', 'zoom_per_scroll_frame', 'look_height_above_top_scaled', 'look_height_adjust', 'look_smoothness', 'mouse_orbit_gain', 'pitch_limit', 'horizontal_fov', 'initial_pitch']
gaps/risks(excerpt): - No shoulder. `_camOffset` is a world-space vector added to the look-at point (282, 286), zero by default (31). It is not rotated by heading, so it is not a shoulder offset. A Frankendom shoulder offset must be in camera right and up.
- Distance snaps. The distance is set with no smoothing (254) and zoom changes instantly per frame (212), so the camera jumps when a wall appears or the player zooms. Frankendom should ease the pull-in in and out separately; the donor does not.
- No auto-follow. `SetHeading` has one caller, at spawn (PlayerSpawner.cs:94). The heading changes only from the mouse while right button is held. The camera never turns to follow the character's facing, and nothing rec
checker: None found. Verified: UpdatePosition 215-262 order (Euler 217, lookAt 218, lerp 220-232 with 8*dt at 227, DetectSphereCollision 244-249, snap 254, placement 255/261), UpdateInputs 192-202 (x3 gain, +/-80 clamp), UpdateZoom 204-213 (5*0.1, clamp), LookAtPoint 269-287 (0.2*scale, -0.3 unscaled), ApplyL2Fov 316-341, collision clamp(hit,0.05,desired) at CameraCollisionDetection 61, radius floor 0.01 at 54, tan(fov) radians bug at 99 and 76, SetHeading sole caller PlayerSpawner:94, TargetManager:104,

### KsanaDock-Microverse (permissive, scope=world, verdict=STRONG, depth=full)
note: /private/tmp/p2/wave2-haiku/batch3/QC003/out/camera/KsanaDock-Microverse.deep.md
best_idea: Keep one remembered distance per camera mode, let a held look override the follow target, and bring it back with one restore key.
decision: adapt - The per-mode distance memory, hold-to-look override and single restore key are a small free-look for a world camera. Adapt them; reject the 2D screen pan and fixed map centre, which do not fit a third-person camera or the owner's over-the-shoulder ask.
acceptance: In a zone, holding the look key and moving the mouse turns the view; releasing and pressing restore eases back behind the hero within about half a second, the distance returns to the follow value, and a unit test shows the follow weight is clamped to 1 at a 0.5-second frame.
tags: follow-point,variable-step,new:mode-memory-zoom,new:hold-focus-restore
data_fields: ['followRate', 'dragSpeed', 'followZoom', 'mapZoom', 'freeZoomStart', 'zoomStep', 'zoomMin', 'zoomMax', 'mapCentre']
gaps/risks(excerpt): - The follow weight is unclamped in the donor (`CameraController.gd` 33-43). With follow_speed 5.0, any frame longer than 0.2 s overshoots. Frankendom must clamp it.
- Deselect while free-looking keeps free mode (107-112). Frankendom's selection and camera logic must clear the free look on deselect, or the camera holds a point with no hero.
- The drag maths divides by zoom (64). In 3D the equivalent is distance, and the screen-to-ground conversion needs a real ray test; the sketch's version is an approximation, not checked on a 3D map.
- The donor has no over-the-shoulder offset, no collision and no yaw or pitch. Almost all of the owner's complaint is outside this donor.
- Confidence that th
checker: -

### STJr-SRB2 (copyleft, scope=world, verdict=STRONG, depth=full)
note: /private/tmp/p2/wave2-haiku/batch3/QC003/out/camera/STJr-SRB2.deep.md
best_idea: A chase camera that closes a fraction of the gap to an ideal spot behind the hero each tick, applies that velocity on the next tick, pulls under ceilings, and snaps behind the hero when blocked with no line of sight.
decision: adapt - Take the ease, ceiling pull and sight-reset shape into a client-only world camera, but not the donor's placement inside the tic loop (the server holds camera state there) and not its centred-behind framing, which gives no over-the-shoulder offset; the lateral offset must be added on purpose.
acceptance: In a headless test the hero walks past a wall: the world camera never sits inside wall bounds on any tick, eases behind the hero (about 97 percent of the gap closed after 10 ticks at speed 0.3), and snaps behind when it has no line of sight to the hero.
tags: follow-point,fixed-step,new:ceiling-pull-down,new:sight-reset-snap,new:speed-fov-widen,new:shake-distance-falloff
data_fields: ['dist', 'height', 'speed', 'camHeight', 'ceilPad', 'lookAhead', 'aimEase', 'pitchClamp', 'resetSettleTries', 'playerFadeRadius', 'hitShakeIntensity', 'hitShakeTime', 'shakeBaseRatio', 'speedFovThreshold']
gaps/risks(excerpt): - Placement: the donor runs the camera in the tic loop (p_tick.c 806, p_user.c 13129-13130 under `server || addedtogame`), so the server holds camera state. Frankendom's ruling says the camera is client-only. Copy the shape, not the placement.
- Standard style has no over-the-shoulder offset: the camera sits on the facing line, centred. The only lateral shift is the `CS_SIMPLE` shift (p_user.c 10154-10156). The owner's complaint is about the over-the-shoulder view, so this donor does not solve it on its own.
- Frame-rate: the ease is per tic (fixed 35 Hz, `camspeed` as a fraction per tic). Frankendom's client needs its own dt-based ease (for example `1 - (1 - speed)^(dt*60)`) if it runs at r
checker: All checked lines/constants hold (cam_dist 192/160 live, height 40, speed 0.3, radius 20/height 16, 41/48 eye, 64 lookahead, 11 ceiling gap, 48 fade, pitch >>3, shake 8/8 and ir*(1-dist/radius), momentum applied next tic, reset conditions, licence GPL-2). Only omissions, none contradicting.

### openmw (copyleft, scope=world, verdict=STRONG, depth=full)
note: /private/tmp/p2/wave2-haiku/batch3/QC003/out/camera/openmw.deep.md
best_idea: An over-the-shoulder focal point that eases between shoulders chosen by side-ray probes, pulls the camera in on a sphere cast, and raises the focal point in combat, all in dt-based steps.
decision: adapt - It is the over-the-shoulder shape the owner asked for: a focal offset with shoulder switching by side probes and a sphere pull-in. Adapt because the offsets and thresholds must be retuned for a 375 px phone view and the donor's Lua policy layer is not copied as is; it stays client-only.
acceptance: At 375 px wide in a zone with a wall within 120 units on the right, the view moves to the left shoulder over about one second; a headless probe test shows the camera never inside a wall (radius 5 sphere); in combat the focal point rises 15 units and eases over about 0.2 seconds.
tags: follow-point,variable-step,new:shoulder-switch-rays,new:focal-offset-transition,new:sphere-pullin,new:speed-zoom-out,new:combat-focal-raise
data_fields: ['baseDistance', 'minDistance', 'maxDistance', 'shoulderOffsetX', 'shoulderOffsetY', 'switchAt', 'switchBackAt', 'sideRayAngles', 'combatOffsetY', 'transitionSpeedCombat', 'transitionSpeedDefault', 'transitionSpeedVanity', 'closerFasterFactor', 'focalSphereRadius', 'cameraSphereRadius', 'focalCeilingLift', 'trackedHeight', 'pitchTerm', 'zoomOutWhenMoveCoef', 'speedSoftCap', 'speedApproachRate', 'speedScale', 'distanceRiseRate']
gaps/risks(excerpt): - The default in the donor is no over-the-shoulder (`viewOverShoulder` false, `settings.lua` 44). The shoulder view is opt-in in the donor, so Frankendom would make it the default on purpose.
- Frankendom's camera is client-only. The donor is also client-only (rendering and Lua scripts), so placement is not a problem here, unlike the SRB2 donor.
- Engine order between the two Lua callbacks and the C++ `Camera::update` was not read; the note assumes the focal target set by Lua is eased on the following C++ update.
- Frame-rate: all steps are dt-based (`camera.cpp` 283, `third_person.lua` 158, `camera.lua` 133). Frame-rate independence is a feature here, not a risk.
- Donor numbers are in map 
checker: (1) note step 3 says shoulder state 'selected' and trySwitchShoulder runs for shoulder states, but real code only calls it when autoSwitchShoulder is on (third_person.lua 100-104, default false settings.lua 47), else uses defaultShoulder; (2) note says combat offset (0,15) 'for combat' but the else branch (123-124) also applies it to Swimming state (91-92); (3) focal sphere cast start is focal-focalOffset with z+10 (camera.cpp 180-186), note says 'from the character side' (sketch caveat admits)

### Card-Forge-forge (copyleft, scope=world, verdict=STRONG, depth=thin)
note: /private/tmp/p2/wave2-haiku/batch3/QC004/out/camera/Card-Forge-forge.deep.md
best_idea: Clamp the world camera's look-at point to the zone bounds every frame, hold it still during scripted pauses, and clamp wheel zoom to a fixed range.
decision: adapt - Take the zone-bounds clamp and the pause hold for the world camera; leave out the snap follow, which a third-person camera must replace with frame-rate-independent smoothing and collision.
acceptance: In an open zone the world camera's look-at point stops at the zone edge: a client test with a 2000 px wide zone and the player at x = 2000 asserts camera x = 2000 - half view width, and the camera does not move during a scripted pause.
tags: follow-point,new:bounds-clamp,new:pause-hold,new:wheel-zoom-clamp
data_fields: ['zone_width_px', 'zone_height_px', 'view_half_width_px', 'view_half_height_px', 'zoom_min', 'zoom_max', 'zoom_step_per_wheel_unit', 'pause_seconds']
gaps/risks(excerpt): - Scope: this is a 2D top-down camera with a hard snap to the player each frame (439-440) and no smoothing. A third-person follow camera needs lag, collision and an over-the-shoulder offset, and none is here. Only the clamp and the pause hold transfer.
- Zoom and clamp: the clamp uses the intended (un-zoomed) size (439-440), while zoom is a separate value (551-555). Whether a zoomed-out view can show past the map edge depends on the viewport's camera size, which I did not read (ScalingViewport internals not read). The Frankendom version should use a zoom-aware half extent.
- Two writers: the portrait override (103) sets camera x after the clamp in `act`, so the donor has two places that set 
checker: -

### MovingBlocks-Terasology (permissive, scope=world, verdict=STRONG, depth=full)
note: /private/tmp/p2/wave2-haiku/batch3/QC004/out/camera/MovingBlocks-Terasology.deep.md
best_idea: Smooth the third-person camera by averaging its recent positions with decaying weights, ease the FOV toward a mode-keyed target at a fixed rate, and tie the view bob to footstep progress so it stops when the character stands still.
decision: adapt - Take the decaying-average smoothing, the rate-limited FOV ease with a mode-keyed extension, and the footstep-phase bob; change the smoothing from a frame count to a time constant, since the donor's lag depends on frame rate.
acceptance: At 30 fps and at 144 fps the camera's lag behind a hero running at a fixed speed is the same within 5 percent, and a fight start widens the FOV by 12 degrees in about 0.24 s and the end restores it; a client unit test with a fixed-step clock asserts both.
tags: zoom-pulse,new:frame-history-smoothing,new:mode-keyed-fov,new:footstep-phase-bob,new:rate-limited-fov-ease
data_fields: ['smoothing_frames_normal', 'smoothing_frames_smooth', 'smoothing_frames_cinematic', 'smoothing_decay', 'fov_ease_rate', 'fov_snap_threshold', 'ghost_fov_extension', 'look_pitch_limit', 'bob_roll_amplitude', 'bob_roll_frequency', 'bob_vertical_amplitude', 'bob_vertical_frequency']
gaps/risks(excerpt): - No third-person camera: this donor is first-person. The third-person rig (orbit, wall pull-in, aim point, lock-on framing) has to come from another donor (the dhewm3 and Card-Forge notes cover parts of it). Only the smoothing, FOV and bob transfer from here.
- Frame-count smoothing: `applyCinematicEffect` counts update calls and never reads `deltaT` (WorldRendererImpl 267 passes the time in, but it is not used for smoothing). The lag therefore changes with frame rate. Frankendom must use a time constant (for example exponential smoothing with `1 - exp(-dt / tau)`).
- Smoothing lags the raw camera. Frankendom's world camera needs the same lag rule for the target and for the look-at point; i
checker: -

### dhewm-dhewm3 (copyleft, scope=world, verdict=STRONG, depth=full)
note: /private/tmp/p2/wave2-haiku/batch3/QC004/out/camera/dhewm-dhewm3.deep.md
best_idea: Place a third-person camera on a circle behind the player, sweep from the player to that spot so the camera is pulled in to the wall with a small lift, and aim at a point ahead of the player.
decision: adapt - Take the orbit spot, the wall pull-in with lift, the look-down clamp and the aim point; add frame-rate-independent smoothing (the donor has none) and use Frankendom's own up axis instead of the donor's gravity axis.
acceptance: With a wall 20 units behind the hero and the camera set 40 units behind, a client unit test with a stub sweep that returns fraction 0.5 asserts that the spot is the hit point raised by 16 units, that it is swept again from the hero, and that the aim points at the focus point 512 units ahead.
tags: follow-point,new:orbit-counter-yaw,new:clip-pull-in,new:lift-on-hit,new:half-pitch-offset,new:focus-aim,new:look-down-clamp
data_fields: ['orbit_range', 'height', 'orbit_angle_deg', 'clip_enabled', 'eye_lift', 'focus_distance', 'pitch_max_deg', 'clip_probe_half_size', 'clip_lift', 'aim_min_horizontal_distance']
gaps/risks(excerpt): - No smoothing: the donor's camera is recomputed from the current origin and angles each call with no damping. A third-person camera needs a frame-rate-independent lag on top; none is in the donor.
- Sweep and geometry: the clip depends on a box sweep against the world's solid collision (MASK_SOLID). Frankendom's zones are data, so the sweep needs the zone's collision geometry on the client. How `TraceBounds` behaves when the start point is already inside solid was not read.
- The one-sided pull-in only handles the case where the spot is behind a wall. It does not push the camera out if the player's own origin is inside geometry (not read).
- Settings are CVAR_NETWORKSYNC in the donor, so ca
checker: -

### Anuken-Mindustry (copyleft, scope=world, verdict=STRONG, depth=full)
note: /private/tmp/p2/wave2-haiku/batch3/QC005/out/camera/Anuken-Mindustry.deep.md
best_idea: Apply camera shake as an offset that is added to a copy of the camera for one frame and removed after the draw, with impact strength falling off with the square of distance, so a shake can never drift the camera and a far hit barely moves the view.
decision: adapt - Take the render-only shake and distance-falloff impact for the world third-person camera; reject the 2D zoom, mouse pan and detached-unit steering (the camera must not drive the character under server-verified input).
acceptance: In a zone, a hit close to the player shakes the third-person view for about the set duration and fades to nothing; a hit about 300 world units away shakes at roughly one ninth strength (if units match donor pixels); a test asserts the rig position is identical before and after a shaken frame.
tags: follow-point,zoom-pulse,new:render-only-shake,new:distance-falloff-impact
data_fields: ['followSmoothFactor', 'zoomLerpFactor', 'defaultZoomScale', 'shakeIntensityCap', 'shakeScreenSetting', 'impactFalloffConstant', 'impactMinDistance', 'detachedUnitStopRadius']
gaps/risks(excerpt): - GPL-3.0: clean-room only. The sketch is written from the described shape; do not copy `Renderer.java` or `DesktopInput.java` lines.
- The donor is top-down 2D. Its shake is a flat 2D offset, and a 3D third-person camera needs the shake in camera-local axes (or as a small rotation). The falloff constant is in donor pixels and must be rescaled to Frankendom units.
- Shake and impact feel are client-only. They must never change server state or kill results (server-verified kills), and they must not be the only way to show a hit (the hit must still be visible on the HUD and in the combat log).
- Pit camera: the Pit view is frozen and tuned, so this mechanism is for the world camera only. If it
checker: -

### opentibiabr-otclient (permissive, scope=world, verdict=STRONG, depth=full)
note: /private/tmp/p2/wave2-haiku/batch3/QC005/out/camera/opentibiabr-otclient.deep.md
best_idea: Drive the world camera's focus from the character's logical position and let it lag by the unfinished part of the current step (clock time), so it eases between tiles instead of snapping, and never moves the character.
decision: adapt - Take the glide-over-the-step shape for the third-person world focus; do not take the 10 ms per queued input rule (input backlog would change fight timing) or the walk-direction viewport widening (visibility is zone data and server-owned).
acceptance: A player holds forward in a zone: the third-person focus eases over the step duration from the previous tile to the new one, reaches the tile at the end, and does not jump when the server confirms a matching move; a test asserts focus at 0%, 50% and 100% of a step equals from, midpoint and to.
tags: follow-point,variable-step,new:glide-lag,new:predicted-step-queue
data_fields: ['stepDurationFormula', 'defaultGroundSpeed', 'followedInputPenaltyPerQueuedStep', 'predictionDropPad', 'predictionDropCap', 'predictedStepCap', 'viewportWidenPerWalkAxis']
gaps/risks(excerpt): - The donor is a 2D tile grid. The pixel walk offset is one tile wide and only moves on one axis per step, so the 3D shoulder rig, collision pull-in, lock-on framing and FOV changes are all absent. Only the glide shape transfers.
- The donor's camera follows the predicted position, and the server confirms or rejects it after the fact (`LocalPlayer::walk`). Frankendom's rulings are server-verified: the camera may show predicted motion but must never change state or kill results, and a rejected prediction must snap the focus back, which the donor does by clearing the queue.
- The "+10 ms per queued step" timing belongs to input handling; in Frankendom it would make the fight step length depend
checker: Step duration is stated and sketched as 1000*groundSpeed/speed, but Creature::getStepDuration 1136-1138 divides by m_calculatedStepSpeed instead when hasSpeedFormula() (new speed law), and returns 0 when speed<1 (1116-1117); the sketch ('as in the donor') divides by speed with no guard. Also the glide uses getStepDuration(true), which includes the +10ms*queued-steps term for the followed local player (1156-1159), so the glide is lengthened by it (note mentions +10 but not its effect on updateWal

### CleverRaven-Cataclysm-DDA (copyleft, scope=world, verdict=STRONG, depth=full)
note: /private/tmp/p2/wave2-haiku/batch3/QC006/out/camera/CleverRaven-Cataclysm-DDA.deep.md
best_idea: Lead the camera along the travel direction by an amount that scales with speed between a dead zone and full speed, clamp it to a safe margin, glide toward it at a fixed rate and snap when close.
decision: adapt - Take the speed-scaled, margin-clamped look-ahead and the glide-then-snap for the world camera; drop the integer tile steps, the per-turn timing and the unclamped factor; zero lead in fights and in the Pit camera.
acceptance: While the hero runs at full speed the world camera leads along the travel direction by up to a data lead (about a third of the frame), and while stopped it sits centred; the lead never pushes the hero outside the safe margin; a client test asserts lead = 0 at speed <= min, lead = max at speed >= max, monotone between, and that the glide reaches the target within the snap distance.
tags: follow-point,new:speed-scaled-lookahead,new:glide-then-snap,new:margin-clamp
data_fields: ['dead_zone_speed', 'tile_speed_unit', 'top_speed_lead', 'border_margin', 'max_lead', 'squeeze_threshold', 'glide_step', 'snap_distance', 'cruise_match_window']
gaps/risks(excerpt): - The donor is a 2D grid roguelike and steps in whole tiles, once per turn or per vehicle move. A third-person camera needs a time-based glide. Do not copy the integer stepping.
- The inverse lerp is unclamped (`cata_utility.h:254`). Below the dead zone the factor is negative (`game.cpp:1397`), so, derived by hand and not run, a nearly stopped car gets a small backward shift of its view (face vector times a negative factor, `1394-1410`). Frankendom must clamp; the sketch does.
- The donor's comment at `game.cpp:1448-1449` says "per draw event" but the call sites are per turn and per move. Do not trust the comment for timing; the sketch uses dt.
- The lead needs a travel vector. A hero on foo
checker: calc_driving_offset 1363-1456 steps, border_range 2, 400 per tile, inverse_lerp unclamped (cata_utility.h 249-256), corner squeeze 0.2, sight clamp 1425-1440, glide one tile else snap (1446-1453), cruise 7 tiles, call sites do_turn 713 and map.cpp 1241, option default true, CC BY-SA 3.0 all match.

### clockworklabs-SpacetimeDB (permissive, scope=world, verdict=STRONG, depth=full)
note: /private/tmp/p2/wave2-haiku/batch3/QC006/out/camera/clockworklabs-SpacetimeDB.deep.md
best_idea: Frame a player's group by the mass-weighted centre of its pieces and widen the view from the group's size (one fixed step once it has more than one piece), so the camera tracks a many-part fight without a fixed zoom.
decision: adapt - Take the group centroid framing and the size-driven zoom with a fixed step per attacker (cap 3); reject the mass term (no mass in Frankendom) and the unclamped lerp; the donor frames its own pieces, so the enemy term is ours to design.
acceptance: In a zone fight the camera holds one rest framing for the hero alone; with one, two and three attackers engaged the frame widens by a fixed step per attacker, the centre moves to the weighted middle of hero and attackers, and a client test asserts zoom is monotone in attacker count and every follow or zoom fraction is clamped to 1.
tags: follow-point,new:group-centroid-framing,new:group-size-zoom,variable-step
data_fields: ['base_radius', 'size_base', 'group_step', 'mass_term_cap', 'zoom_floor', 'follow_rate', 'zoom_rate', 'input_send_rate']
gaps/risks(excerpt): - The donor is 2D, top-down and frames the player's own pieces. The framing and the widening rule transfer to a 3D world camera; the projection and the mass weighting do not. Frankendom's version must frame the hero and the attackers it is fighting (MAX_ATTACKERS = 3). That enemy term is our design, not in the donor.
- Unclamped fractions: the donor's follow overshoots once `delta x 8` exceeds 1, that is a frame longer than 0.125 s (below 8 fps); the zoom overshoots once `delta x 2` exceeds 1, a frame longer than 0.5 s. Derived from the weights, not run. Frankendom must clamp (the sketch does).
- Zero-piece state, derived from the code and not run: with a local player and zero owned pieces, 
checker: Licence paragraph says 'the repo root has no LICENSE file, only licenses/'. False: root has LICENSE.txt (SpacetimeDB Business Source License 1.1). The conclusion (demo/Blackholio/LICENSE is Apache-2.0) is correct, but the root BSL is the file a reader would hit first and should be named. Camera maths all verified (CameraController.cs 21-48, zero-piece size -20 -> zoom 50, TryGetCenterOfMass 71-98, GameManager 178, send rate 20/s, steering third of height).

### supertuxkart-stk-code (copyleft, scope=world, verdict=STRONG, depth=full)
note: /private/tmp/p2/wave2-haiku/batch3/QC006/out/camera/supertuxkart-stk-code.deep.md
best_idea: Pull a third-person follow camera back as speed rises, floored at twice its rest distance, and ease its offset with a per-frame fraction dt / max(dt, T) so the lag is close to frame-rate independent.
decision: adapt - Take the speed-scaled pull-back, the 2x distance floor and the dt/T easing for Frankendom's world camera; STK's camera is behind-centre with no shoulder offset and no wall collision, so we must add those ourselves; the drone preset is not a default; the dead steering side term is not ported.
acceptance: At rest the world camera sits 2.0 m behind and 0.85 m up and never closer; at sprint it eases to about 3.75 m and 1.25 m up over about 0.2 s with no snap on a 50 ms hitch; a client test asserts distance >= 2 x rest distance at speed 0 and that offsets after 1 s at 60 Hz and 30 Hz differ by less than 5% of the gap.
tags: follow-point,new:speed-scaled-pullback,new:dt-over-smooth-lerp,variable-step
data_fields: ['rest_distance', 'pullback_min_factor', 'pullback_base', 'pullback_speed_slope', 'reverse_speed_floor', 'height_base', 'height_speed_slope', 'position_smooth_time', 'rotation_smooth_time', 'look_at_height', 'frame_dt_cap', 'up_vector_blend', 'flying_follow_back', 'start_offset_back', 'fov_deg', 'drone_preset_distance']
gaps/risks(excerpt): - GPL-3.0-or-later: clean-room only. The sketch is written from the mechanism, not translated.
- STK's camera is a behind-centre chase camera, not over-the-shoulder. Its steering side offset is zeroed in the donor (`camera_normal.cpp:70`); the only sideways motion is the skid swing (`111`, `127-129`). The shoulder offset the owner wants must be added by us and tested; this donor does not supply it.
- No wall collision in the donor. A grep of `src/graphics/camera` for collision or raycast matched only `camera_debug.cpp`. The pull-in against walls must be designed separately (not read in the donor).
- No lock-on, no multi-target framing, no combat zoom and no camera shake in the normal camera.
checker: None material. All cited lines, defaults (0.2/0.125/1.0, drone 2.6/33deg), 2.8+5.6*ratio, 2x floor, 0.85+ratio/2.5, 0.04 up blend, -33 restart, 50ms cap, GPL-3-or-later header verified. Small omission: moveCamera also has 'if (distance > 0) camera_distance += distance + 1' (camera_normal.cpp:120) not described.

### diasurgical-DevilutionX (restricted, scope=world, verdict=STRONG, depth=full)
note: /private/tmp/p2/wave2-haiku/batch3/QC007/out/camera/diasurgical-DevilutionX.deep.md
best_idea: Anchor the camera on the last committed position and glide it with the step's animation progress, so the view moves between two confirmed positions and snaps onto the new one at commit.
decision: adapt - The anchor-on-commit plus glide-by-progress shape gives Frankendom a smooth step between server-confirmed positions, but the donor is a 2D tile game with a fixed step table, so Frankendom needs a continuous lerp driven by the server commit event, and the licence is restricted so only the shape transfers.
acceptance: While the hero steps, the world camera glides from the previous confirmed position to the new one over one step's duration and snaps onto the confirmed position on the frame the commit lands; a client test asserts the camera anchor equals the last committed position at every commit and the glide offset is zero at commit.
tags: fixed-step,stale-state,follow-point,new:glide-to-commit
data_fields: ['stepScreenVectorPx', 'progressFractionBase', 'tileWidthPx', 'tileHeightPx', 'commitAtLastAnimationFrame', 'bossDeathPanEndCounter']
gaps/risks(excerpt): - Sustainable Use License 1.0: a restricted licence, not open source. Clean-room only; nothing is adapted line by line.
- The donor is a 2D isometric tile game. The tile grid, the step table and the panel offsets do not transfer. What transfers is the anchor and glide, and it needs a continuous-position version (a lerp from the last confirmed position to the next over the step duration) rather than per-direction tables.
- The donor's anchor is the local player's last committed tile, which is the same as a server-confirmed position only if the local game commits on the server's word. Frankendom's rule is that the server verifies kills; the camera must not show a glide to a position the server
checker: -

### ioquake-ioq3 (copyleft, scope=world, verdict=STRONG, depth=full)
note: /private/tmp/p2/wave2-haiku/batch3/QC007/out/camera/ioquake-ioq3.deep.md
best_idea: Aim the third-person camera at a focus point ahead of the hero, back it off along the view, and when a sweep from the eye hits a wall pull it in to the hit, lift it by a little, and sweep once more, so it never clips.
decision: adapt - The pull-in-and-aim shape is the fix the owner needs for world-zone clipping, but the donor has no smoothing and its side-angle yaw does not aim at the focus point, so Frankendom must add a frame-rate-independent lag and aim at the focus point directly.
acceptance: In an open zone with a wall directly behind the hero, the world camera stops in front of the wall, rises by at most 32 units as it closes, keeps the hero's aim point centred in a 375-wide still mid-fight, and a client test asserts the camera origin is never behind a hit surface across 60 sampled poses.
tags: follow-point,zoom-pulse,new:wall-pull-in
data_fields: ['rangeUnits', 'sideAngleDeg', 'focusUnits', 'focusPitchMaxDeg', 'hullHalf', 'liftMaxUnits', 'eyeLift', 'backOffPitchRatio', 'zoomMs', 'zoomFov', 'baseFov', 'errorDecayMs']
gaps/risks(excerpt): - GPL-2.0-or-later: clean-room only. The sketch is written from the mechanism, not from the donor lines.
- No smoothing on the position. The donor follows the predicted eye exactly every frame, apart from the 100 ms prediction-error decay. A third-person camera in Frankendom needs its own frame-rate-independent lag (not in the donor); the donor gives no numbers for that.
- The yaw after a non-zero side angle is turned back by the angle, but the pitch was aimed at the unrotated focus point (294, after the aim at 288-293). With a non-zero side angle the screen centre is therefore not the focus point. This is read from the code, not run. Frankendom should aim the camera at the focus point direc
checker: CG_OffsetThirdPersonView 226-295 order, FOCUS_DISTANCE 512, pitch clamp 45, +8 lift, half pitch, range 40 / angle 0 defaults, 8x8x8 box, lift (1-fraction)*32, aim pitch via atan2, error decay 100 ms, orbit delay 50, ZOOM_TIME 150, timeNudge +/-30, GPL-2.0-or-later: verified. Errors: the claim that after the second trace the camera 'may still be inside the wall' is unsupported (line 280 copies trace.endpos, the second hit point, so it stops at the hit); the trace-skip cvar is cg_cameraMode (cvar 

### lincity-ng-lincity-ng (copyleft, scope=world, verdict=STRONG, depth=full)
note: /private/tmp/p2/wave2-haiku/batch3/QC007/out/camera/lincity-ng-lincity-ng.deep.md
best_idea: Keep the clamp's overshoot as a debt in base units and re-apply it before the next clamp, and zoom about the point under the cursor so that point does not move on screen.
decision: adapt - The clamp-to-bounds with a remembered correction and the zoom-about-a-fixed-point rule fit a world camera's zone limits and distance changes, but the 2D pan, the sqrt(zoom) speed law and the isometric maths do not, because a third-person camera follows the hero rather than being panned.
acceptance: In a zone, when the hero walks to the zone edge the camera aim point stops at the zone boundary with no void visible in a 375-wide still, and a client test that walks the hero to the edge and back asserts the aim point stays inside the zone rectangle on every frame.
tags: variable-step,clamp-and-report,debt-carry,new:zoom-about-anchor
data_fields: ['panPxPerSecondAtZoom1', 'shiftPanMultiplier', 'zoomStepFactor', 'zoomMin', 'zoomMax', 'zoomSnapToOne', 'edgeScrollBorder', 'clampMarginTiles', 'guiIntervalMs']
gaps/risks(excerpt): - GPL-2.0-or-later: clean-room only. The sketch is written from the mechanism.
- It is a 2D isometric donor. The clamp, the speed law and the aspect normalisation are 2D projections and do not transfer as they are. What transfers is the shape: (a) clamp a focus point to the playable rectangle, (b) remember the overshoot and re-apply it before the next clamp, and (c) keep a fixed point on screen while a distance changes.
- The debt is re-applied on the next clamp, not glided back. When the constraint lifts, the view jumps to the un-clamped place on the next constrain call (reading only, not run). A third-person camera should decide whether it wants a snap or a glide; the donor gives neither a
checker: -

### alexbatalov-fallout2-ce (restricted, scope=world, verdict=STRONG, depth=full)
note: /private/tmp/p2/wave2-haiku/batch3/QC008/out/camera/alexbatalov-fallout2-ce.deep.md
best_idea: Let the camera walk toward its wanted position one step at a time, refuse any step that both pans farther from the player past a leash box or lands on a blocker, and stop at the last clear step (or revert the whole move when the caller asks), so a third-person camera pulls in at walls instead of clipping.
decision: adapt - The donor's tile maths and jumps do not fit, but the step-walk with a leash box and blocker refusal is the pull-in rule the world camera lacks; implement it in 3D with a cast per step.
acceptance: Client test: a third-person camera moving toward a wanted position behind a wall stops at the last clear step and never ends inside geometry; it never ends farther than the leash from the player; with the revert flag set, a blocked move returns to where it started.
tags: new:camera-leash,new:step-walk-revert,clamp-and-report
data_fields: ['leash_box_x', 'leash_box_y', 'pan_min_interval', 'pan_step', 'scroll_blocker_object', 'path_capacity']
gaps/risks(excerpt): - Licence: Sustainable Use License 1.0 is not an open-source licence and limits use to internal or non-commercial purposes. Only the shape of the rule may be used. The sketch is written from the mechanism and copies nothing.
- 2D, tile-based: the leash box is in screen pixels of an isometric view, and the blocker test is per tile. A third-person camera needs a 3D test (a ray or sphere cast from the target to the wanted camera position, stepped in fixed fractions) and a 3D box or leash around the player. Only the walk-and-stop and revert shape transfers.
- No follow: the donor camera does not track the player while he walks. Frankendom's world camera needs its own follow and lag. Do not take 
checker: Verified tileSetCenter 537-600 (leash 556-561 with 480/400, scroll blocker 565, border 575), _tile_scroll_to 1947-1982 (flags 0x01 revert, 0x02 refresh, 200 path), _obj_scroll_blocking_at pid 0x500000C at 2572, mapScroll 33 ms throttle and 32/24 step, defaults 75/78, tile.h flags, callers (game.cc, map.cc 1272), licence Sustainable Use.

### orbitersim-orbiter (permissive, scope=world, verdict=STRONG, depth=full)
note: /private/tmp/p2/wave2-haiku/batch3/QC008/out/camera/orbitersim-orbiter.deep.md
best_idea: Cap how fast the look rate can change (8 rad/s^2) and slow it as it nears a limit (remaining angle x 8), and ease any drag or pull-back offset to zero with a 3 s smoothstep, so camera moves ease in and out instead of snapping, all driven by the frame's real dt.
decision: adapt - The donor's chase orbit is instant (no lag, no collision), so Frankendom's world camera should keep only the rate caps, the slow-down near a limit, and the smoothstep settle; the orbit and lag must be designed for us.
acceptance: Client unit test with variable dt: a full-rate look held 0.1 s then released gives a yaw rate that never exceeds 2 rad/s, changes by at most 8 rad/s^2 x dt per frame, and never changes sign after release; in play, a flick of the look stick eases to a stop with no snap.
tags: follow-point,new:look-rate-cap,new:drag-offset-ease,new:zoom-clearance-scaled
data_fields: ['look_rate_cap', 'look_accel_cap', 'near_limit_slowdown', 'drag_settle_time', 'follow_distance_default', 'min_follow_distance', 'wheel_zoom_step', 'mouse_yaw_per_px', 'keyboard_ramp_frames']
gaps/risks(excerpt): - The donor's chase view is instant. It has no lag and no smoothing, so copying the orbit as the world camera would keep the over-the-shoulder problem the owner has with the current view. The transferable parts are the rate caps, the settle-back, and the zoom step, not the orbit itself.
- No collision pull-in was found in the code I read. The only clip handling is a dynamic near plane for planet surfaces (block from 1207, body not receipted). Frankendom needs its own wall pull-in (a ray from the target to the desired camera position, pull to the hit point); this donor does not supply one.
- No lock-on and no framing of several targets. The donor frames one target only. The many-on-one framin
checker: (1) Zoom floor: note says units of 'scale = max(scale, 1/target->Size())' not verified and drops it from the sketch; code and comment (Camera.cpp 524 'move at least 1m/s') make it clear: shift (x dt seconds) * scale is a fraction of rdist-in-radii per second, so floor = 1 m/s. Dropping it leaves the sketch zoom at ~1e-4 step near 1 radius, i.e. stalls, unlike the donor. (2) 'cockpit is the only rate-limited look' - external keyboard yaw is also rate-ramped (Orbiter.cpp 2103-2116), which the note

### OpenEnroth-OpenEnroth (copyleft, scope=world, verdict=STRONG, depth=full)
note: /private/tmp/p2/wave2-haiku/batch3/QC009/out/camera/OpenEnroth-OpenEnroth.deep.md
best_idea: A camera rig that sits a fixed distance behind the hero along the facing at eye height, turns at a set rate per real second, and clamps look-up to about 22 degrees.
decision: adapt - The fixed back offset at eye height, the per-second turn rate with a fixed-step fallback and the look clamp are the rig shape a third-person follow camera needs; the donor is first-person with no smoothing or collision, and its armageddon jitter writes the party's real facing, so that part is rejected.
acceptance: Client test: holding turn for 1 s changes view yaw by 90 degrees, look-up stops at 22.5 degrees, and the view stays 25 units behind the hero at eye height; a server test asserts that a camera shake leaves the hero's facing and position unchanged.
tags: new:rigid-offset-camera,variable-step,new:discrete-turn-fallback,new:pitch-clamp,new:state-jitter,new:shake-decay
data_fields: ['back_offset', 'eye_height', 'turn_rate', 'ticks_per_real_second', 'turn_step_fallback', 'look_step', 'look_clamp', 'fov_outdoor', 'fov_indoor', 'clip_near', 'clip_far', 'jitter_units_per_update', 'jitter_timer_ticks']
gaps/risks(excerpt): - LGPL-3.0 (copyleft class). Clean-room only: the sketch is written from the mechanism; the numbers are design data.
- First-person, not third-person. The 25-unit back offset keeps the camera almost on the hero's head. A third-person follow needs a much larger offset, a pitch model with pull-in, and a smoothing step. The donor has none of those. What transfers: the offset-at-eye-height shape, the time-based turn rate, and the look clamp.
- No smoothing or lag. The camera copies party yaw and pitch every draw (Engine.cpp 137-138), so there is no follow, no damping and no frame-rate independent smoothing. Frankendom needs its own.
- No collision in the rig. The placement (Engine.cpp 139-141) d
checker: -

### electronicarts-CnC_Remastered_Collection (copyleft, scope=world, verdict=STRONG, depth=full)
note: /private/tmp/p2/wave2-haiku/batch3/QC009/out/camera/electronicarts-CnC_Remastered_Collection.deep.md
best_idea: Frame a group by the mean of their positions, offset by half the view, then clamp the view into the level bounds and report whether the clamp moved it.
decision: adapt - The mean-then-clamp group framing and the clamp-reports-shift flag are the shape the fight camera needs for hero plus up to three attackers (MAX_ATTACKERS = 3); the donor is top-down 2D, its keyboard and edge scroll are not transferable (edge scroll is not live), and its instant snap must be replaced by easing.
acceptance: In a 1-on-3 fight the view centres on the mean of the four positions, clamped to the zone edge, and eases to it with a configured half-life; a client test asserts the framed centre equals the four-point mean when unclamped and the origin stays inside the zone when clamped.
tags: clamp-and-report,fixed-step,new:group-centroid-framing,new:snap-to-desired
data_fields: ['group_frame_rule', 'frame_half_view', 'map_clamp_bounds', 'clamp_shift_report', 'keyboard_step', 'redraw_apply_delay']
gaps/risks(excerpt): - GPL-3.0 with EA additional terms. Clean-room only. The sketch is written from the mechanism. The additional terms bar using "Command & Conquer" or EA trademarks, so do not name the donor in any Frankendom output. The indemnity clause applies only to a conveyor who assumes contractual liability; it does not change the clean-room rule for us.
- The live donor is top-down 2D with a snap. What transfers: the group mean, the half-view offset, the clamp with a shift flag. What does not: the lepton grid, the sidebar width, the keyboard scroll and the snap. A 3D third-person camera needs yaw and pitch, a follow offset and collision, none of which is here.
- The dead edge scroll must not be mistake
checker: -

### hedgewars-hw (copyleft, scope=world, verdict=STRONG, depth=full)
note: /private/tmp/p2/wave2-haiku/batch3/QC009/out/camera/hedgewars-hw.deep.md
best_idea: Keep a look-ahead point a fixed on-screen distance ahead of the hero, ease it toward its target by a fixed share each update, move the view only when that point leaves an edge dead zone, and let a manual pan above a small threshold hand control back to the player.
decision: adapt - The dead zone, fixed-distance look-ahead and manual-input hand-over are the shape a third-person follow camera needs and the owner's world camera lacks; the donor is 2D with per-pass smoothing, so smoothing must be time-based and yaw, pitch and wall pull-in must be added.
acceptance: A player walks a hero across a zone: the view holds still inside the middle band, then eases so the hero sits about 200 px ahead of their facing side, and a manual drag above 4 px per frame turns auto-follow off until it is turned back on (client test on a fixed input trace).
tags: follow-point,new:dead-zone-push,new:look-ahead,new:manual-input-handover,variable-step,clamp-and-report,new:shake-decay
data_fields: ['lead_px', 'follow_blend_kept', 'edge_dead_zone', 'manual_break_px', 'manual_cursor_edge_px', 'vertical_lead_threshold', 'zoom_ease_per_ms', 'zoom_default', 'cam_limit_x', 'cam_limit_y', 'loop_min_step_ms', 'shake_start_amount', 'shake_lifetime']
gaps/risks(excerpt): - GPL-2.0 (version 2 only, per the source headers). Clean-room only: the sketch is written from the mechanism, and the donor numbers are design data.
- 2D, not 3D. The donor follows an x/y offset in a side view. A third-person camera needs yaw and pitch aim, pitch limits and collision pull-in, and this donor has none of them. What transfers: the dead zone, the fixed-distance look-ahead, the manual-input hand-over and the zoom easing. What does not: the offset model and the 2D bounds.
- Frame-rate dependence in the donor. The 7/8 blend runs once per `DrawWorld` pass, and the loop only passes every 8 ms or more (hwengine.pas 325-327). Follow speed therefore depends on loop cadence. Zoom is per
checker: 7/8 blend (1975), z=round(200/zoom) (1951), 4 px manhattan hand-over (1954), vertical lead _10 test (1978), cGearScrEdgesDist formula (259), zoom 0.002*Lag (920-933), shake maths (2147-2148) and explosion caller (851-854), cTimerInterval 8, cCamLimit constants, GPL v2-only header: verified. Small: step (a) is described as 'if window has focus (1948)' but the real guard is not(ExtDriven and cursor visible and no ammo menu and autoCam) and cHasFocus and GameState<>gsConfirm, and is compiled out un

### PixelGuys-Cubyz (copyleft, scope=world, verdict=STRONG, depth=full)
note: /private/tmp/p2/wave2-haiku/batch3/QC010/out/camera/PixelGuys-Cubyz.deep.md
best_idea: A follow point driven by an exact closed-form damped spring, stepped by the real frame delta, with a velocity kick on step-up and on landing, so curbs and ledges move the camera smoothly without a fixed-step loop.
decision: adapt - The donor camera is a first-person eye, so its shape transfers but its framing does not. The exact-step spring and step-up/landing kicks suit a third-person follow point and remove curb and landing jitter; shoulder offset, wall pull-in, lock-on framing and combat FOV are not in this code and must be designed for Frankendom. The numbers are client tuning, not zone data.
acceptance: A client unit test asserts that one step of 1/30 s equals two steps of 1/60 s within 1e-9, and that a 0.1 m vertical offset with no kick returns to within 1 mm of rest in about 0.35 s; aim rays stay on the unsprung pivot.
tags: follow-point,variable-step,new:closed-form-spring,new:step-up-kick,new:coyote-lock,new:crouch-blend,new:mouse-delta-averaging
data_fields: ['spring_force_multiplier', 'spring_damping', 'eye_height_standing', 'eye_height_crouched', 'crouch_rate', 'step_kick_speed_factor', 'step_kick_floor', 'landing_bounce_factor', 'ledge_coyote_lock', 'base_gravity', 'pitch_limit', 'mouse_rate', 'mouse_average_slots', 'fov']
gaps/risks(excerpt): - GPL-3.0: clean-room only. The sketch is written from the mechanism. The constants are tuning values and are not copied as code.
- First-person, not third-person. The eye is the camera. The donor has no shoulder offset, no follow distance, no pitch limit tuned for over-the-shoulder, no wall pull-in toward the character, no lock-on framing, no FOV change in combat, and no shake. `renderer.zig:155` has an open `// TODO: player bobbing`. I searched the camera, eye, fov and bobbing names and found nothing more; the search covered the Zig source only.
- No horizontal lag. The spring force is only `-k * pos`. Body velocity does not enter the spring; it enters only the step-up kick (physics.zig:50
checker: None. Verified physics.zig 420-512 (force 400, friction 30, k = 400/extent, step state -0.1 test, coyote z skip, closed-form complex solve 487-495, step kick max(1.5|vel|, vel_z, 4) and eye.pos.z -= step), 593-614 landing/doubling/coyote sqrt(2h/g)+dt, baseGravity 30, game.zig 762-793 crouch (dt*10, smoothstep, 1.7->1.3, eye box 0.2/0.05), 809/824/830, eye render sum 143, pitch clamp pi/2-0.001, Window.zig 3-slot averaging 0.0089 (552-581, 809-815), main.zig frame delta unclamped client side, se

### amilich-isometric-city (permissive, scope=world, verdict=STRONG, depth=full)
note: /private/tmp/p2/wave2-haiku/batch3/QC010/out/camera/amilich-isometric-city.deep.md
best_idea: Keep the camera's scroll limits as a function of the current zoom and the map size, and when the zoom changes keep the point under the cursor fixed before clamping, so the view can never leave the level.
decision: adapt - The donor is a 2D pan and zoom, so only two rules transfer: zoom-aware bounds that come from zone size, and zoom anchored at a chosen point. Reject the screen-pixel keyboard pan, whose world speed changes with zoom, because a 3D camera should pan in world units. The donor has no third-person pitch, yaw, shoulder offset, lock-on or collision.
acceptance: A client test asserts that after a wheel zoom the anchor stays within 1 px of its screen position before the clamp, and that at every zoom the look point stays inside the zone bounds plus a 100 px margin; in play, zooming toward a fighter keeps that fighter at the same screen point.
tags: follow-point,new:view-bounds-clamp,new:cursor-anchored-zoom,new:proportional-zoom-step,new:drag-threshold
data_fields: ['scroll_margin', 'tile_width', 'tile_height_ratio', 'zoom_min', 'zoom_max', 'wheel_zoom_step', 'drag_threshold', 'key_pan_speed', 'key_pan_frame_cap', 'wheel_idle_clear']
gaps/risks(excerpt): - The donor is 2D and top-down over a tile grid. It has no third-person pitch, yaw, shoulder offset, follow target or collision. Only the bounds rule and the anchored zoom transfer. Lock-on framing, combat FOV change and shake are not in this code.
- Screen-pixel keyboard pan. `offset` is in pixels (637-640), so the world speed of the keyboard pan is `520 / zoom` world pixels per second. At zoom 0.3 it is about 3.3 times as fast as at zoom 1 (derived from `world = (screen - offset) / zoom`). A 3D camera should pan in world units; reject this for Frankendom.
- No smoothing. Every camera change is a state set (wheel, drag, minimap, keys). A third-person camera needs the lag and smoothing from 
checker: -

### OpenDiablo2-OpenDiablo2 (copyleft, scope=world, verdict=STRONG, depth=full)
note: /private/tmp/p2/wave2-haiku/batch3/QC011/out/camera/OpenDiablo2-OpenDiablo2.deep.md
best_idea: Keep one camera target that the hero writes each frame unless free look is on, let free look pan that same target, and always ease the camera toward it.
decision: adapt - The shared target, the free-look gate and the pan-the-target rule give manual look and auto-follow one code path for the world camera; the per-call 0.85 gain is frame-rate dependent and the one-frame target delay adds lag, so both are rejected.
acceptance: With the hero walking at a steady speed the camera trails by the same distance at 30 and 60 fps; holding the free-look key pans the view and releasing it returns to the hero within 0.5 s; the pan never changes the hero's position. A client test asserts the trailing distance agrees at 30 and 60 fps and that the pan leaves server state unchanged.
tags: follow-point,new:free-look-override,variable-step
data_fields: ['follow_gain_per_call', 'follow_half_life_s', 'free_look_pan_step_units', 'free_look_pan_step_shift_units', 'free_look_return_s']
gaps/risks(excerpt): - This donor is a plain 2D follow. It has no dead zone, no look-ahead, no shoulder offset, no pitch, yaw, zoom, collision, shake or lock-on. Most of the owner's list is not covered here.
- The fixed 0.85 gain per call is frame-rate dependent (the `elapsed` argument is passed in and never used, camera.go 52). Do not copy it. The time-based ease in the sketch has a steady lag of the hero's speed times the half-life over ln 2 (about 0.115 s at an 0.08 s half-life), the same at any frame rate. That half-life is a proposal to tune.
- The one-frame target delay (game.go 273-277) is a real lag source. In Frankendom, set the target and ease in the same client frame.
- Transferable pattern: one share
checker: camera.go 52-58 gain -0.85 with ignored elapsed; follow target written after controls advance (game.go 273-277, controls at 235 -> renderer.go 624); FreeCam gate; arrow step 8/16 with Shift; MoveTo aliasing at camera.go 14; GPL-3 LICENSE; lag 1/0.85 derivation checked by hand.

### daggerfall-unity (permissive, scope=world, verdict=STRONG, depth=full)
note: /private/tmp/p2/wave2-haiku/batch3/QC011/out/camera/daggerfall-unity.deep.md
best_idea: On a hit above a small fraction of max health, start a short decaying camera wobble in a random direction whose size is fixed by that hit, and compute it from elapsed time so it does not change with frame rate.
decision: adapt - The threshold, the hit-sized duration and the decaying wobble are a cheap impact cue for the world camera; the donor's per-frame Rotate accumulator, its 2.5-5 s duration and its first-person Euler rotation do not fit a fast duel or a third-person camera, and its severity is lost after the first frame.
acceptance: On a hit above 2 percent of max health the camera wobbles in a random direction and returns to rest within the hit's duration; a bigger hit gives a bigger wobble for its whole duration; a server test asserts the wobble never changes the hit result; a client test asserts the angle at a given time after the hit is the same at 30 and 120 fps.
tags: new:impact-sway,hit-aggregation,variable-step
data_fields: ['min_hit_fraction', 'base_amplitude_deg', 'setting_scale', 'duration_steps_per_fraction', 'timer_rate_rad_per_s', 'severity_per_health_point', 'proposed_sway_duration_s']
gaps/risks(excerpt): - Amplitude finding (read from the code, not run). `healthLost` is a one-frame delta (VitalsChangeDetector.cs 93, 120), and `CalculateRotationScalar` re-reads it every frame (CameraRecoiler.cs 72, 156). From the frame after the hit, `healthLost` is 0, so `healthLostFactor` is the 0.015 floor. The hit's size therefore affects only the hit frame, where `sin(timer)` is about sin(2 pi x frame time), roughly 0.1 at 60 fps, and the sway duration (133). The rest of the sway has the same amplitude for every hit above 2 percent. The donor comment at line 155 ("each point of health lost makes the sway %1.5 of max effectiveness") describes the intent, which the code does not deliver. Do not port this; 
checker: None. All numbers and lines match: CameraRecoiler Update 64-110, 2% threshold 77/80, timerStart piScalar=5+floor(pct*5) at 133-135, timer 2*pi/s at 99-100, base 50 at 45, settings 0/.25/.5/.75/1 at 142-146, healthLostFactor clamp(0.015..1) at 156, sin per axis 166-167, Rotate at 104 with no deltaTime, bSwaying=(timer>0) at 107, ResetRecoil on init/load/court, VitalsChangeDetector UpdateDeltas 93-94/120 one-frame delta, so the 'amplitude only reflects the hit frame' finding holds. PlayerMouseLook

### exult-exult (copyleft, scope=world, verdict=STRONG, depth=full)
note: /private/tmp/p2/wave2-haiku/batch3/QC011/out/camera/exult-exult.deep.md
best_idea: Keep the world camera still while the hero stays inside a centred dead box, move it one step only when the hero leaves that box, and glide the move without crossing a jump larger than a few tiles.
decision: adapt - The dead box, look-ahead on the destination tile, snap threshold and stop-settle are the parts a 3D third-person follow camera can keep; the donor is a 2D tile scroll, so pixel offsets and map wrap are rejected.
acceptance: The camera holds still while the hero moves inside the centre box, follows within one step time after the hero leaves it with no overshoot, and snaps for a jump at or above the snap distance; a client test asserts the position is unchanged for moves inside the box and reaches the target within one glide length.
tags: follow-point,hysteresis,variable-step,new:snap-on-far-jump,new:stop-settle,new:screen-shake
data_fields: ['dead_box_tiles', 'snap_threshold_tiles', 'frame_delay_ms', 'glide_percent_of_step', 'glide_window_multiple', 'slow_walk_threshold', 'shake_offset_px', 'shake_pass_interval_ms', 'shake_first_delay_ms', 'shake_passes']
gaps/risks(excerpt): - This donor is a 2D tile scroll: no shoulder offset, no pitch or yaw limits, no zoom, no collision, no lock-on, no framing of several targets. Those parts of the owner's list are not in this donor and need another donor or our own design.
- What transfers to a 3D third-person follow camera: the dead box (in screen space, as a fraction of the viewport, since tile units do not exist in 3D), the look-ahead on the destination, the glide with a snap above a jump threshold, the stop-settle, and the shake as an offset on the camera transform.
- What does not transfer: tile-quantised pixel offsets, the wrap-around map math, isometric projection, and the chunk cache (`emulate_cache`, gamewin.cc 1146
checker: -

### TurningWheel-Barony (permissive, scope=world, verdict=STRONG, depth=full)
note: /private/tmp/p2/wave2-haiku/batch3/QC012/out/camera/TurningWheel-Barony.deep.md
best_idea: Aim each camera axis at its target on the logic step (velocity = gain x error), integrate at a fixed render step with an accumulator, blend by alpha, rate-limit the eye height to a setpoint with bob held until it settles, and use a view-direction pull-back for a third-person camera.
decision: adapt - The donor's living camera is first-person and its only third-person mode (ghost camera) has no collision, so the fixed-step aim, render blend, rate-limited eye setpoint and view-direction pull-back shape transfer to a world third-person camera, but the wall pull-in and framing must be added and the constants moved to client data.
acceptance: In a zone the camera height eases over a fraction of a second on a step with no snap, the view pulls in when a wall is behind the character and never clips, and a headless test asserts the camera converges to its target within N render steps with bob at zero while the eye height is moving.
tags: fixed-step,accumulator,follow-point,new:setpoint-rate-limit,new:camera-pullback,new:shake-decay,new:render-alpha-blend
data_fields: ['logic_hz', 'render_step_s', 'max_steps_per_frame', 'camera_gain', 'eye_offset_z', 'eye_swim_offset_z', 'eye_rate_min', 'eye_rate_max', 'eye_rate_fraction', 'eye_snap_tolerance', 'bob_move_limit_land', 'bob_move_limit_swim', 'pullback_distance', 'pullback_height_drop', 'pullback_ease', 'ghost_pitch_limit', 'shake_max', 'shake_lowpass_yaw', 'shake_lowpass_pitch', 'shake_decay_yaw', 'shake_decay_pitch', 'shake_hit_yaw', 'shake_hit_pitch']
gaps/risks(excerpt): - The camera is client-only. Nothing in this camera step may feed a hit test, a kill, a target lock or the ledger; kills stay server-verified.
- No collision pull-in in the donor. The ghost pull-back (2526-2530) is applied with no wall test, so a third-person camera in Frankendom needs its own ray test and pull-in before the offset is applied. This is the largest gap against the owner's over-the-shoulder concern.
- No lock-on, no many-enemy framing and no combat FOV or zoom change were found in the camera code read (`game.cpp` 6550-6822 has a `fov` swap at 6822 but its use was not traced). For MAX_ATTACKERS = 3 the framing has to be designed, not ported.
- Designer data versus engine constan
checker: -

### jynew-jynew (restricted, scope=world, verdict=STRONG, depth=full)
note: /private/tmp/p2/wave2-haiku/batch3/QC012/out/camera/jynew-jynew.deep.md
best_idea: A pivot that follows the acting character with a per-second lerp weight in combat and snaps while exploring, with bounded orbit, zoom and pan on top, and every timed camera move written as a fixed-step ramp with its own guard.
decision: adapt - The donor shows a working per-turn pivot follow with bounded zoom-with-undo, which fits a world camera, but its guards are one-way, its smoothing is frame-rate dependent and its third-person collision is in Cinemachine code not shipped here, so the shape transfers and the maths must be rewritten.
acceptance: When the acting character changes, the camera glides to it over a fraction of a second without a jump; wheel zoom stops at its height limits without sliding sideways; a headless test asserts a ramp moves in both directions and reaches its target within duration x 60 steps.
tags: follow-point,new:camera-pivot,new:role-focus-switch,new:bounded-zoom-undo,new:guarded-ramp,new:timed-effect
data_fields: ['follow_smoothing', 'orbit_speed', 'orbit_battle_multiplier', 'zoom_speed', 'zoom_min_height', 'zoom_max_height', 'touch_zoom_min_height', 'touch_zoom_max_height', 'pan_speed', 'battle_fov_min', 'battle_fov_max', 'reset_fov', 'ramp_steps_per_second', 'ramp_timer_padding', 'shake_duration', 'shake_amplitude', 'shake_frequency', 'prefab_fov', 'prefab_shoulder_offset', 'prefab_collision_radius', 'prefab_collision_mask']
gaps/risks(excerpt): - Third-person collision and shoulder maths are Cinemachine's and are not in the donor. Only the settings (shoulder offset, collision mask, damping) transfer. The owner's over-the-shoulder pull-in still needs our own ray test.
- No lock-on or many-enemy framing in the camera scripts read. The pivot follows one role (the acting one). MAX_ATTACKERS = 3 framing has to be designed; `BattleManager` was not read.
- One-way guards. `ChangeFOV` only raises FOV (guard `FieldOfView < finalFov`, 303). `ChangeFreeLookHeight` and `ChangeFreeLookRadius` only lower (guards at 370 and 408). The reset helpers only move up to their value (389, 427) or down to 60 (350). A ramp in the other direction silently d
checker: (1) Trigger helper: note says on enter the player's direction lock is set; it is conditional on enterLockDirection (CinemachineTriggerActionHelper.cs 40-44) and exit also locks direction if exitLockDirection (63-67), unmentioned. (2) Note says follow VCam active only in Follow mode and outside world map at 'GameViewPortManager 48, 88'; line 88 (InitForLevel) activates on viewport type only, world-map exclusion is only in SetViewport (48). Rest verified: licence lines (LICENSE:8, README:290), Cam

### alexbatalov-fallout1-ce (restricted, scope=world, verdict=STRONG, depth=full)
note: /private/tmp/p2/wave2-haiku/batch3/QC013/out/camera/alexbatalov-fallout1-ce.deep.md
best_idea: A camera can move toward a wanted point by sampling the line to it, stopping before the first sample that a leash or a blocker refuses, and never moving farther from the hero once it is beyond a leash box, while still allowing moves back toward the hero.
decision: adapt - The leash rule (free to return, refused outward past a box around the hero) and the sample-and-stop walk (optional all-or-nothing) are the shape a world camera needs for wall pull-in and hero leash; not adopt, because the 2D tile grid, the screen-pixel numbers and the object-flag blocker do not transfer, and the donor camera does not follow the hero per step.
acceptance: In a world zone with a wall between the wanted camera spot and the hero, a unit test on a fixture wall asserts the camera stops at the last clear sample on the line, and a second test asserts that a step beyond the leash box never moves the camera farther from the hero, while a step back toward the hero is accepted.
tags: new:leash-box,new:sample-and-stop,new:all-or-nothing-revert,new:wall-clock-throttle,clamp-and-report
data_fields: ['leash_box_x', 'leash_box_y', 'pan_step', 'pan_throttle', 'sweep_path_cap']
gaps/risks(excerpt): - Not a follow camera. The donor recentres on the hero only on events (section 1), so it cannot show how to keep the hero in frame during movement. The owner's over-the-shoulder follow has to come from another donor (see the dkfans-keeperfx note, cell 14).
- The blocker is an object flag on a tile (`obj_scroll_blocking_at`, body not read), not wall geometry. The donor gives the stepping shape (sample toward the wanted point, stop at the first blocked sample). A 3D world needs a real wall test (ray or sphere), which this donor does not have.
- The leash box is in screen pixels of a 2D isometric view. 480 and 400 must become world-unit data for each zone, not be copied.
- The leash comparison 
checker: -

### dkfans-keeperfx (copyleft, scope=world, verdict=STRONG, depth=full)
note: /private/tmp/p2/wave2-haiku/batch3/QC013/out/camera/dkfans-keeperfx.deep.md
best_idea: A third-person follow camera can keep a focus point a fixed distance ahead of the hero, turn its yaw toward the hero's facing by a capped angle each tick, and move the focus by a capped distance each tick, so it never snaps.
decision: adapt - The per-turn clamped follow (turn limit to facing, per-axis move limit, zoom-in while controlled) is the shape the world camera needs; not adopt, because the donor is a top-down isometric grid camera with no wall test and no lateral shoulder offset, which the owner's over-the-shoulder camera needs.
acceptance: After a 180-degree turn of the hero in a world zone, the camera yaw reaches the hero's facing in a bounded number of steps, and a unit test asserts that no step changes yaw by more than the turn limit and no focus axis moves more than the move limit.
tags: follow-point,fixed-step,zoom-pulse,new:turn-rate-limit,new:velocity-halving
data_fields: ['turn_limit', 'move_limit', 'lookahead_radius', 'zoom_step_in', 'zoom_cap_while_controlled', 'velocity_halving', 'move_to_min_step']
gaps/risks(excerpt): - No wall pull-in in any camera path. This matters most for the owner's ask. `project_point_to_wall_on_angle` (engine_camera.c 109-130) walks a ray to a solid wall, but it is called by ranged-attack code (thing_creature.c 3802, 3814; thing_traps.c 1345), not by the camera. In local_camera.c, engine_camera.c and packets.c (and their headers) the only solid test is inside that function (engine_camera.c 121). Frankendom needs collision from another source.
- Sign of the look-ahead is unverified. The comment says "move toward a point behind the creature's eyes" (local_camera.c 674). The arithmetic puts the focus at creature plus `radius` along the camera yaw, and the turn step sets that yaw to t
checker: None in main claims. Verified local_camera.c 661-683 order (zoom_in_step 100/85 +1 cap 30000, yaw clamp DEGREES_30=170, radius=eye height+z, per-axis clamp 128, velocity clear), engine_camera.c 143-148/243-254/474, packets.c 410/413 (2560000/zoom, x3), bflib_planar.c 86-98, LICENSE GPL v2, quake 30 / +-40 jitter / -32 decay, wall-ray only in project_point_to_wall_on_angle. Nits: step also zeroes velocity_rotation (682); interpolation lerp factor is interpolate_time only if Ft_DeltaTime is on (lo

### ClassicUO (permissive, scope=world, verdict=STRONG, depth=thin)
note: /private/tmp/p2/wave2-haiku/batch3/QC014/out/camera/ClassicUO.deep.md
best_idea: While a look key is held, the camera leans toward the cursor by an ease-out amount with a fixed cap, and releasing the key eases it back to centre without a snap.
decision: adapt - The hold-to-look, capped and eased lean fits a world camera that needs look-ahead; it must be rebuilt in ground-plane world units for a third-person camera, kept off the frozen Pit camera, and kept out of target selection, since the engine and server never read the camera.
acceptance: Client test in a world zone: with the look key held and the cursor 300 px right of centre the view moves right by no more than the cap; release returns the view to centre with no overshoot; the tile under the cursor when hit-tested matches the tile drawn there.
tags: follow-point,new:cursor-lean-offset,new:zoom-invariant-clamp,variable-step
data_fields: ['max_lean_px', 'lean_ease_span', 'approach_time_factor', 'approach_min_speed', 'snap_distance', 'zoom_min', 'zoom_max', 'zoom_step', 'default_zoom', 'lean_ease_curve']
gaps/risks(excerpt): - Scope. This is a 2D isometric camera. A third-person camera needs a world-unit lean on the ground plane, a pitch and yaw model, shoulder offset, collision pull-in, lock-on framing and damped follow. None of these are in this donor. Only the lean and the zoom transfer.
- Picking follows the lean. `MouseToWorldPosition` uses the inverse matrix (Camera.cs 100, 143-151), and `GameScene.Update` uses it to set the mouse-picked world position (GameScene.cs:720). A Frankendom lean must go through the same inverse, or clicks land on the wrong tile. Test with the lean on.
- Targeting. The lean must not feed target choice. Target selection and MAX_ATTACKERS = 3 belong to the engine in src/fight. The 
checker: Note describes GetViewPort (GameSceneDrawingSorting.cs 1186-1290) as how the camera follows/centres on the player and says the lean is 'added to the tile offset' there; that function computes the visible-tile culling range for the draw list (lean enters at 1238-1241 only to shift culling). Actual view centring/lean is done only through the matrix in Camera.UpdateMatrices. Everything else verified: BSD-2 SPDX line 1, constants 12-14 (250, 0.01, 5), CalculatePeek 189-224 incl. mirror 199-200 and e

### XProger-OpenLara (permissive, scope=world, verdict=STRONG, depth=full)
note: /private/tmp/p2/wave2-haiku/batch3/QC015/out/camera/XProger-OpenLara.deep.md
best_idea: Keep the orbit distance fixed, pull the eye in to the wall with a clip that slides along the wall on a circle of the same radius, and ease the eye at a frame-rate-independent rate (30/speed per second) so the view never clips through geometry.
decision: adapt - Take the shape (orbit from a focus point, pitch clamp, wall pull-in that keeps the offset distance, rate-based eye follow, per-state orbit presets). Do not take the 1024-unit tile-grid collision or the look-only head aim. The donor has no over-the-shoulder offset, so we must add a lateral term ourselves.
acceptance: A player with a wall about one sector behind sees the camera slide along the wall and never pass through it; the eye catches up within about 0.4 s after a fast turn while the view angle turns at once; the camera stays behind the character's facing in follow and combat.
tags: follow-point,fixed-step,new:wall-pull-in,new:state-preset-angle,new:per-tick-request
data_fields: ['offset_follow', 'offset_combat', 'offset_look', 'eye_speed_follow', 'eye_speed_combat', 'look_mode_eye_rate', 'look_offset_recentre_rate', 'look_point_y_rate', 'pitch_clamp', 'stick_pitch_max', 'stick_yaw_max', 'look_pitch_range', 'look_yaw_range', 'wall_inset', 'eye_headroom', 'look_point_height_fraction', 'shake_decay', 'shake_amplitude', 'shake_phase', 'fov_third_person', 'look_at_front_cone', 'preset_hang_pitch', 'preset_reach_yaw', 'substep_cap', 'frame_dt_clamp', 'floor_shake_radius']
gaps/risks(excerpt): - No over-the-shoulder offset. Nothing in this donor moves the eye sideways; the eye sits on the line behind the actor's facing (camera.h:524-525; `getDir`, controller.h:784-786). The owner's over-the-shoulder ask needs a lateral term on the look point (a right-hand vector times a shoulder distance), which we must add and test ourselves. This is not in the donor.
- One target only. The camera turns to face one look target (Lara's nearer arm target, or a trigger target in front). It never widens to frame several enemies. For many-on-one (MAX_ATTACKERS = 3) the donor gives no framing rule. In our rulings the engine owns the hate list and target choice (zones as data, one engine), so the client
checker: Mechanism (g) says look point x/z 'follow the actor exactly (511)'; getViewPoint 144-147 swaps in the box centre when centerView is set (death, water-out, push/pull block, special states per lara.h 2951-3000), so x/z are not always the actor position. Look-mode head offset is vec3(0,-128,0) in joint space (152): 'lowered by 128' is unverified given y-down; do not rely on direction. Preset list in (f)/sketch names only reach/hang/slide; the real state table (lara.h 2949-3006) also has back-jump y

### MrAntares-roBrowserLegacy (copyleft, scope=world, verdict=STRONG, depth=full)
note: /private/tmp/p2/wave2-haiku/batch3/QC016/out/camera/MrAntares-roBrowserLegacy.deep.md
best_idea: Use one zoom-to-state rule with explicit per-state bands (pitch, FOV, zoom step), and fade geometry that sits between the eye and the hero instead of pulling the camera past walls.
decision: adapt - The three-state rig and the between-eye-and-hero fade fit a world third-person camera, but Frankendom must add hysteresis, an eased FOV and a wall pull-in, which this donor does not have.
acceptance: In a zone, zooming past the third-person line changes the view without a flicker at the line (a band, not a single threshold), the FOV eases over 0.3 s instead of snapping, and a wall between the camera and the hero fades to 25 percent opacity within 150 ms while the hero stays visible; a client test asserts no state flip while the zoom goal moves inside the band.
tags: new:camera-state-rig,new:zoom-band-per-state,new:occluder-fade,new:screen-quake,follow-point,variable-step
data_fields: ['zoomSpan', 'thirdPersonThreshold', 'zoomFloorIso', 'zoomFloorThird', 'zoomFloorFirst', 'zoomCeilingOutdoor', 'zoomCeilingIndoor', 'pitchBandIso', 'pitchBandThird', 'pitchBandFirst', 'fovIso', 'fovThird', 'fovFirst', 'zoomStep', 'zoomStepMultThird', 'focusLiftThird', 'focusLiftFirst', 'yawDragPerScreenWidth', 'pitchDragPerScreenHeight', 'easeRatePerMs', 'easeGain', 'quakeMultiplier', 'quakeDurationDefault', 'quakeDurationEffect', 'quakeSideAmount', 'quakePitchAmount', 'quakeZoomAmount', 'doubleClickWindow', 'doubleClickRadius', 'defaultZoomGoal', 'fadeInMs', 'fadeOutMs', 'fadeFrameGapCap', 'fadeRadius', 'fadeOpacity', 'fadeEndBeforeFocus', 'queryCapsuleRadius', 'saveDelay']
gaps/risks(excerpt): - GPL-3.0: clean-room only. The sketches are written from the mechanism, not from the donor lines.
- The donor's third person is a close orbit behind the hero with a focus lift; it is not an over-the-shoulder offset. The focus is the hero's own position with a height lift (544) and no sideways offset. Frankendom needs a shoulder offset added by the client, and the donor gives no lateral offset to copy.
- Camera collision: the donor has no pull-in (no collision query in `Camera.js`). Its answer to walls is the fade (Part E). A wall pull-in is still needed for a camera that must not sit inside a wall; the fade covers only what is between the eye and the hero.
- No hysteresis at the threshold: 
checker: None found. Checked about 30 claims: all Camera.js state-machine lines (29-40, 117-139, 284-291, 322-346, 358-434, 436-483, 490-551), quake 212-263 and EffectTable 3020/3158, OccluderFade.js 58/63/64/97-99/136-160/250-266, GLSL 26-85, Graphics.js 82-84, MapRenderer 277/327, Renderer 307, license GPL-3. Part C order matches. Sketch constants and clamps match. Minor: Camera.init is also called from EffectViewer.js:72 (note lists only MapEngine 689 and MapViewer 187).

### vthibault-roBrowser (copyleft, scope=world, verdict=STRONG, depth=full)
note: /private/tmp/p2/wave2-haiku/batch3/QC016/out/camera/vthibault-roBrowser.deep.md
best_idea: Let input write a goal (pitch, yaw, zoom) with clamps applied at the write, and ease the drawn camera toward that goal each frame, so drags and wheel steps never jerk the view.
decision: adapt - The goal-and-ease split and clamp-at-write are right for the world camera, but the orbit centre must become an over-the-shoulder offset with collision pull-in, which this donor does not have.
acceptance: In a zone, a right-drag (or two-finger drag) turns the view, the pitch stays inside its band, the wheel changes distance in fixed steps, and a double-click recentres yaw behind the hero; a client unit test asserts that a 16 ms step moves the yaw about 19 percent of its gap to the goal and that no goal leaves its clamp.
tags: follow-point,variable-step,new:orbit-goal-ease,new:double-click-recentre
data_fields: ['pitchMin', 'pitchMax', 'pitchDragPerScreenHeight', 'zoomMin', 'zoomMax', 'zoomDragPerScreenHeight', 'wheelStep', 'yawDragPerScreenWidth', 'yawLimit', 'lerpPerMs', 'easeGain', 'doubleClickWindow', 'doubleClickRadius', 'defaultPitch', 'defaultZoom', 'zoomSaveDelay', 'spriteFacingSectors']
gaps/risks(excerpt): - GPL-3.0: clean-room only. The sketch is written from the mechanism, not from the donor lines.
- This is an orbit camera around the player, not an over-the-shoulder follow. There is no shoulder offset (the focus point is the player's exact position, `Camera.js` 304-312), no look-at offset, no collision (none in the file), no auto-yaw follow, and no lock-on or multi-target framing. What transfers: the input-goal and ease split, the clamp-at-write rule, the drag-scaling by screen size, the double-click recentre, and the frame-time lerp. What does not transfer: the orbit centre and the placement of the eye, which Frankendom's over-the-shoulder view must add itself (shoulder offset, collision p
checker: All numbers verified (lerp 0.006*ms cap 1, gain 2.0, pitch 190..270, zoom 2..150 = 15*10, yaw -360..360, 720/300/150 drag rates, 500 ms/10 px double click, 3000 ms save, wheel 15, direction floor((yaw+22.5)/45)%8, FOV 15 deg at Renderer.js 191, default zoom 50 smooth true, GPL-3.0). One false statement: 'Nothing writes the drawn values directly' - the yaw wrap in processMouseAction (Camera.js 250-258) and Camera.init (154-157) write angle[] directly, and Mobile.js 268-270 writes zoomFinal.

### Clancey-wowrust (restricted, scope=world, verdict=STRONG, depth=full)
note: /private/tmp/p2/wave2-haiku/batch3/QC017/out/camera/Clancey-wowrust.deep.md
best_idea: Keep the camera a pure function of target, yaw, pitch and distance, with rotation applied only while the look button is held and all clamps in one update step.
decision: reject - The orbit has no smoothing (dt unused), no wall test and no shoulder offset, so it would bring back the faults the owner is unhappy with. Collision and smoothing come from the WoWee note; this donor is kept only as a reference for the plain clamps. Licence is private, so clean-room only.
acceptance: Not built. If it were, the camera would pass through walls when the character stood against one; a client test asserting it does not would fail on this donor.
tags: follow-point,new:gated-rotation
data_fields: ['look_height_above_feet', 'default_distance', 'min_distance', 'max_distance', 'scroll_step', 'rotate_sensitivity', 'pitch_limit', 'default_fov']
gaps/risks(excerpt): - No wall or collision test anywhere in camera.rs: the camera would sit inside geometry. Not usable for the owner's world camera without the WoWee collision (its `camera_controller.cpp` 2119-2224).
- No smoothing: the target snaps to the player each frame and `dt` is unused, so any hitch is a visible jump. Frankendom needs the frame-rate independent lag from WoWee (cpp 2358-2359) instead.
- Centred orbit, no shoulder offset (camera.rs 40-49). The owner's over-the-shoulder view is not in this donor.
- Distance step is a fixed 2.0 per notch, not scaled to the current distance (camera.rs 89). WoWee scales it (cpp 3726). A fixed step is relatively coarser at 2 units than at 50 (my inference from
checker: All cited lines verified (camera.rs 12-22/25-37/40-49/52-58/78-93/96-105; lib.rs 1148, 1846-1851, 2163-2191, 2638, 2843-2884; unused _dt; update_third_person single non-test caller at lib.rs 2881; README 'Private project'). Weakness: note claims the camera sits 'directly behind the head along the yaw' and walks are camera-relative, but position() puts the camera at +(cos yaw, sin yaw) from the head looking back at it, while movement_forward() is +(cos yaw, sin yaw): walk-forward points TOWARD th

### Kelsidavis-WoWee (restricted, scope=world, verdict=STRONG, depth=full)
note: /private/tmp/p2/wave2-haiku/batch3/QC017/out/camera/Kelsidavis-WoWee.deep.md
best_idea: A third-person camera pulled in by walls with a fast pull-in and a slow give-back, a zoom debt repaid only after a clear spell, and a small yaw step-around before pulling in.
decision: adapt - The donor pivot is centred on the character, not over the shoulder, so Frankendom keeps the collision and smoothing shape and adds a lateral shoulder offset to the pivot; the 88 degree pitch clamp is too loose for a follow camera and is not copied. Licence is restricted, so clean-room shape only.
acceptance: A player backs into a wall in a zone: the camera slides in within about 0.1 s, does not jitter on a slope, eases back out over about 0.4 s once clear, and a client test asserts the rendered camera distance is never past the wall limit after the pull-in.
tags: follow-point,debt-carry,new:asymmetric-ease,new:wall-step-around,new:terrain-raymarch-limit,new:shake-envelope
data_fields: ['zoom_ease_rate', 'follow_rate_default', 'wall_clearance_radius', 'wall_clearance_epsilon', 'collision_pull_in_tau', 'collision_recover_tau', 'zoom_debt_pull_tau', 'zoom_debt_settle_seconds', 'zoom_debt_give_tau', 'deflect_max_angle', 'deflect_min_gain', 'terrain_clearance', 'min_distance', 'max_distance_normal', 'max_distance_indoors', 'wheel_step_fraction', 'pitch_limit', 'mouse_sensitivity', 'floor_clearance', 'shake_fade_start', 'pivot_default_height']
gaps/risks(excerpt): - Licence: MIT with a restriction against commercial game use. Frankendom is a game product, so this is clean-room shape only. The sketch is written from the described mechanism.
- Centred pivot: the donor has no lateral offset (cpp 2061). The owner's over-the-shoulder view needs an offset added to the pivot, and the wall logic must then be checked from the offset point, not the centre. This donor does not show that case.
- No lock-on, no multi-target framing, no combat FOV change in the camera files read (grep for lock-on, shoulder and FOV found none in `camera_controller.cpp`; `setFov` callers are the renderer and settings only). Frankendom's MAX_ATTACKERS = 3 many-on-one framing has nothi
checker: none found; checked ~20 claims (wall limit 0.32+0.22, tau 0.06/0.40, zoom debt 1.0/1.0/2.5, step-around 14deg gain 1.0 tau 0.12/0.30, terrain tau 0.18/0.45 clearance 0.40, follow 30/s and 1:1 while rotating, shake 70% envelope, pitch +/-88, wheel step, kMaxPhysicsDelta, licence)

### samwhosung-benilla (permissive, scope=world, verdict=STRONG, depth=full)
note: /private/tmp/p2/wave2-haiku/batch3/QC017/out/camera/samwhosung-benilla.deep.md
best_idea: When the camera's eye is pinned by a wall, a vertical look drag tilts the view through a one-sided bias while the eye stays put, and the bias eases home at a fixed speed once the wall clears.
decision: adapt - The donor pulls the eye in on a wall and tilts the view; Frankendom keeps the eye pull-in and takes only the clip-gated, one-sided look bias and the fixed-duration cosine ease, because it gives the shoulder shot a way to look over a wall without swinging into it. Drop the water corridor, head bob and terrain tilt. Its bias is one-sided, so it does not help when looking down; say so in the plan. Numbers must be Frankendom's own, not copied from the WoW binary the comments cite.
acceptance: A player with a wall behind a shoulder camera drags the view upward: the eye does not move, the view tilts up over the wall, and when the wall clears the view eases back to level at 90 degrees per second. A client unit test asserts that with clipped set and a vertical drag the eye position is unchanged while the bias rises.
tags: follow-point,new:clip-tilt,new:duration-tween,new:head-origin-sweep
data_fields: ['collision_probe_radius', 'collision_return_rate', 'pitch_limit', 'look_bias_home_speed', 'pivot_drag_max_yaw_per_event', 'pivot_drag_min_pitch_per_event', 'channel_equal_epsilon', 'pivot_height_ceiling', 'pivot_height_rate', 'zoom_step_per_notch', 'zoom_glide_speed', 'zoom_max', 'zoom_default']
gaps/risks(excerpt): - The donor both pulls the eye in on a wall (camera.rs 1190-1199) and tilts the view (1162-1173, 915-923). Frankendom must pick one. The clip-tilt shot is the one the owner needs; the eye pull-in is still needed so the eye never sits inside geometry.
- The clip flag used for a drag is last frame's (camera.rs:915 passes `rig.clipped`, set by the previous sweep). That is one frame of lag on the first frame of a wall; acceptable, but the test should allow it.
- The sweep is a sphere of 0.3 against solids (collision.rs:41): it does not see thin geometry edges that are smaller than the sphere, and it is two-sided. Frankendom's zone collision must have the same radius or the shot will differ at a 
checker: Nits: view/arm pitch is clamp(cam.pitch + terrain_tilt.pitch()) (camera.rs 1165), note and sketch say clamp(pitch) (ground tilt omitted but disclosed); SmoothChannel.arm also requires matching delay and factor memo for 'already arming' (camera_channel.rs 143-146), duration = gap/rate*factor (162) and angular channels rewrap live (133-141) - not in mechanism/sketch. All constants (0.3, 6.0, 89 deg, 90 deg/s, 0.05, 0.0, 0.001, 1.2, 8.33, 1.0, 50, 15), routing/advance logic, call sites (camera.rs 9

### ZaneDubya-UltimaXNA (copyleft, scope=world, verdict=STRONG, depth=full)
note: /private/tmp/p2/wave2-haiku/batch3/QC018/out/camera/ZaneDubya-UltimaXNA.deep.md
best_idea: The camera target is the mover's drawn position (last whole cell plus the fraction of the current step, advanced by frame time), so the view glides continuously across a step.
decision: adapt - The drawn-position target and frame-time progress fit a 3D follow camera; the isometric projection (44 px tiles, 4 px per Z, altitude rows) does not, and the donor drops leftover time at a step end, which we should carry.
acceptance: Client test samples the camera target every 16 ms across a 400 ms walk step and asserts it equals the hero drawn position each sample, with no jump larger than one frame's share; in play there is no stutter at cell edges.
tags: follow-point,variable-step,new:drawn-position-target,new:snap-on-arrival
data_fields: ['walk_step_ms', 'run_step_ms', 'iso_tile_px']
gaps/risks(excerpt): - The donor does not answer the over-the-shoulder ask. It has no yaw, no pitch, no zoom, no collision, no lock-on, no shake and no FOV change. Grep for camera across the whole tree found nothing; `CreateLookAt` is absent, and the only projection is the 2D orthographic sprite batch (`SpriteBatch3D.cs` 73). The owner's world camera must be designed; this donor supplies only the target choice.
- Client prediction: the local player is moved before the server answers (MobileMovement 172-177). In Frankendom the server verifies. The camera may follow a predicted position, but it must snap to the server's position on a correction, and the donor's correction path was not read.
- Carry-over: the donor
checker: Verified: CalculateViewport 245-283 incl. firstZOffset=|(Z+Z_offset)/11| when Z>0 (257), 44/22 tile consts (29-30), x/y offset lines 273-282, IsometricRenderer.Update 74-94, WorldView.Draw centre 73/124, MobileMovement progress 199-236, MovementSpeed 400/200 ms (16-17), Position3D 64-66, licence GPL3 / Position3D GPL2+. Error: 'Long moves (more than one cell away): the logical cell moves one cell toward the goal per update (205-223)'. Real code (205-222) sets the current cell to goal minus/plus 

### daeken-OpenEQ (permissive, scope=world, verdict=STRONG, depth=full)
note: /private/tmp/p2/wave2-haiku/batch3/QC018/out/camera/daeken-OpenEQ.deep.md
best_idea: The view camera is the eye point pushed back along the movement look vector, then pulled in to the nearest solid hit on that segment with a fixed clearance.
decision: adapt - The pull-in is the missing piece for the world camera, but the donor has no shoulder offset and no damping, so Frankendom must add both as client-only data.
acceptance: Client unit test: with a wall 5 units behind the hero, the view point stops at least the clearance short of the first hit; in play the wall is never drawn between hero and camera, and the view does not jump as the wall crosses the line (damping is our addition).
tags: follow-point,new:collision-pull-in,new:orbit-yaw-pitch
data_fields: ['orbit_distance', 'collision_clearance', 'focus_offset_from_eye', 'mouse_look_sensitivity', 'pitch_limit', 'own_body_below_eye', 'eye_above_feet', 'default_fov_y']
gaps/risks(excerpt): - The donor does not answer the over-the-shoulder ask. Focus is on the centreline at eye height; there is no lateral offset, no shoulder side, no lock-on, no framing of several enemies, no FOV change in combat, no shake and no recentring. Grep for shoulder, shake, lock-on, recentre, zoom and fov changes in `openeq/src` and `openeq-render/src` found none for the camera. Those must be designed in Frankendom; the donor only supplies the pull-in.
- No damping. The pulled-in distance snaps. Our fix must be frame-rate independent smoothing on the pulled-in distance only, and it must never let the smoothed point cross the clearance. This is our addition, not the donor's.
- Client-only ruling: the d
checker: No errors found. Verified view_camera 2336-2356 (18 offset, 0.35 padding, door clip from focus to clipped point), clip_camera 249-270, segment_hit 144-160, candidates 752-764 (4096 at 757), update_camera pitch clamp 546-548 / 0.0035 (line 33) / feet=eye-6 (610), forward vector 595-597, schedule 328-342 (Update chain then Last render_frame), 1654-1658 order, live.rs 2012-2015 / 2117 / 2130, scene.rs fov 70deg 832, F9 1121-1122, reset 142, pick 2437, MIT OR Apache-2.0 Cargo.toml 14. Sketch matches

### crossuo-crossuo (copyleft, scope=world, verdict=STRONG, depth=thin)
note: /private/tmp/p2/wave2-haiku/batch3/QC019/out/camera/crossuo-crossuo.deep.md
best_idea: Drive the world camera from the character's visual position (logical tile plus the fraction of the walk step already done), so it glides with the walk and does not snap at tile boundaries, and lift it by a fixed amount per height unit.
decision: adapt - Frankendom's over-the-shoulder world camera should follow the hero's interpolated position and lift with height; the 2D projection, the 22/44 px constants and the one-sided shake do not transfer.
acceptance: Client test: in a zone a one-tile hero step moves the camera target across the step duration with no jump at the tile boundary (per-frame change no larger than the hero's per-frame visual change plus one frame), and a raised tile lifts the target by the zone's lift value per height unit.
tags: follow-point,variable-step,new:screen-shake-timer,new:step-interpolation
data_fields: ['walk_step_ms', 'run_step_ms', 'mounted_walk_step_ms', 'mounted_run_step_ms', 'step_margin_ms', 'tile_shift_cardinal_px', 'tile_shift_diagonal_px', 'lift_per_height_unit', 'shake_duration_s', 'shake_magnitude', 'shake_jitter_span', 'render_frame_delay_active']
gaps/risks(excerpt): - 2D isometric donor: it has no shoulder offset, no pitch or yaw, no collision pull-in, no lock-on or many-enemy framing, no FOV or zoom change, no recentring, and no input-vs-auto-follow blend. Only the follow-the-visual-position rule and the height lift transfer to a 3D third-person camera. The 22 and 44 px constants and the tile-to-pixel projection do not.
- The donor snaps the logical tile at step end: `m_X` changes on the frame the step is removed (1434), after the last offset was computed one frame earlier (inferred from the order at 1340 and 1390; not measured). A small one-frame jump of up to one frame of travel is possible. Frankendom should avoid this by holding the visual position
checker: (1) Note says the offset is computed only 'if delay < maxDelay' (1371-1377); real code computes OffsetX/Y/Z for every valid step each frame, even in the frame where delay >= maxDelay (removeStep set at 1340, offsets then reset at 1447); the guard is the badStep/same-tile branch, not delay<maxDelay. (2) Offsets are truncated to 8-bit char ((char)x, 1375/1379-1380), so pixel offsets are integer-quantised; not mentioned. (3) GetWalkSpeed treats speed-mode FAST_UNMOUNT and flying as mounted (PathFin

### ikemen-engine-Ikemen-GO (permissive, scope=pit, verdict=STRONG, depth=full)
note: /private/tmp/p2/wave2-haiku/batch3/QC019/out/camera/ikemen-engine-Ikemen-GO.deep.md
best_idea: Frame the world camera on the extremes of all tracked enemies and the hero (a dead zone of a fixed margin on each side, so the view moves only when someone reaches the margin), and normalise its smoothing by the tick rate.
decision: adapt - Take the dead-zone framing over every tracked fighter for the world camera's many-on-one case and keep tick-normalised smoothing; reject the side-on edge and zoom rules and do not change the frozen Pit camera.
acceptance: Client unit test on the world camera: with the hero and three enemies in a zone, after 60 ticks the view contains every tracked fighter inside the margin; a fighter inside the dead zone does not move the view; the Pit camera output is unchanged (frozen-snapshot test).
tags: fixed-step,accumulator,new:dead-zone-framing,new:tracked-extremes,new:leader-speed-floor,new:zoom-hold
data_fields: ['framing_tension_margin', 'edge_smooth_fraction', 'tension_velocity', 'edge_snap_step', 'logic_rate_base', 'zoom_in_hold_ticks', 'zoom_in_speed', 'zoom_out_speed', 'zoom_in_limit', 'y_mix_toward_target', 'z_blend_per_tick', 'vertical_follow']
gaps/risks(excerpt): - The donor is a 2D side-on arena with stage bounds, so the framing and the zoom work in one dimension. The world camera is 3D and third-person: shoulder offset, pitch and yaw, collision pull-in and lock-on are all absent here and must come from elsewhere (not in this donor).
- Edge speed floor: the view keeps pace with the fastest tracked edge. In Frankendom a fast enemy leaving the frame would push the camera; a cap on the floor is needed (the donor has none). Not tested here.
- The donor's tension and zoom values are per stage (stage file keys, stage.go 1273-1327). In Frankendom these are zone data, but the Pit must keep its own frozen values.
- The Z smoothing and vertical follow are not
checker: Main mechanism, constants (0.05, gameWidth/3200, 60/logic speed, tensionvel clamp 0..20, tension 50, MIT licence) and tick order all verified. Small: note calls the right-side tension test 'symmetric' but camera.go ~368-376 is an else-if (left test wins when both hold); Y/zoom parts honestly flagged not read.

### pier-oliviert-lineage (restricted, scope=world, verdict=STRONG, depth=full)
note: /private/tmp/p2/wave2-haiku/batch3/QC020/out/camera/pier-oliviert-lineage.deep.md
best_idea: Pin the local player at the screen centre and draw every other entity at centre plus its tile offset times the tile size, so the view keeps no state beyond the viewport centre (the donor applies this only to the packet sender).
decision: reject - The donor camera snaps every packet, leaves the floor static and re-places only the packet sender's sprite, and nothing in it answers the owner's shoulder, smoothing, collision or framing asks; its one useful rule (the view is client-only) is already our ruling.
acceptance: A still of the world camera taken mid-run at 375 wide shows the floor moving under the hero, and a remote hero glides between packets instead of jumping one tile.
tags: follow-point,new:snap-on-packet
data_fields: ['tilePx', 'viewportW', 'viewportH']
gaps/risks(excerpt): - Licence unclear: clean-room only. The sketch was written from the mechanism; no donor lines are copied.
- Snap: each Move packet jumps the sprite to its new tile. A world follow camera needs smoothing that is frame-rate independent. The donor has none, so do not copy the snap.
- Static floor: the ground never moves, so characters slide over a fixed tile texture. Do not treat this as a model for a world camera.
- Absent (read, not present): shoulder offset, pitch and yaw limits, collision pull-in, zoom, lock-on or multi-enemy framing, shake, recentring. The donor is 2D top-down, so a 3D third-person camera gets nothing from its geometry.
- The camera reads character data and writes only spr
checker: All cited lines verified (camera.coffee 3-5/9-11/13-14, game_controller 6/9/52-54/74-85, characters 16-21, tiles 3/8/16-29, character.coffee 9/16-18, move.coffee int16 at 6-7 under src/packets/server/, no licence). Overclaim: Mechanism says 'every other character is drawn relative to' the local player and Best idea says the view keeps no state beyond the centre; in fact camera.position runs only for the character whose packet just arrived (game_controller 79, 85), so when the local player moves 

### LostCityRS-Client-TS (permissive, scope=world, verdict=STRONG, depth=full)
note: /private/tmp/p2/wave2-haiku/batch3/QC021/out/camera/LostCityRS-Client-TS.deep.md
best_idea: A third-person camera can run as two rates: the focus eases toward the hero on each fixed tick, yaw and pitch are velocities that ease in while a key or drag is held and halve on release, and the pitch floor rises fast and falls slowly with the terrain while the distance grows with pitch.
decision: adapt - Centred orbit with no shoulder offset, no wall pull-in and no recentring, so it does not solve over-the-shoulder alone; the tick-stepped follow, the velocity input and the asymmetric terrain pitch floor are cheap shapes to take into the world camera, with the truncation fixed and a shoulder offset and wall pull-in added by us.
acceptance: After a run up a slope the camera lifts over about 0.5 s and settles back over about 1.6 s with no jitter; a test feeding the same 1 s of input at 50 Hz and 144 Hz asserts the same camera pose within 1 unit.
tags: follow-point,fixed-step,accumulator,hysteresis,new:orbit-velocity-impulse,new:terrain-pitch-floor
data_fields: ['follow_divisor', 'follow_snap_gap', 'yaw_speed_target', 'pitch_speed_target', 'pitch_min', 'pitch_max', 'distance_base', 'distance_per_pitch', 'terrain_window_radius', 'terrain_clamp_factor', 'terrain_floor_rise_divisor', 'terrain_floor_fall_divisor', 'tick_ms', 'aim_height_above_ground', 'shake_amp_ran_rate', 'shoulder_offset']
gaps/risks(excerpt): - Not an over-the-shoulder view. The aim point is the focus, so the hero sits in the centre of the frame. A shoulder offset must be added (the sketch's `shoulder`, ADDED). This donor does not solve the owner's complaint by itself.
- No wall pull-in. The camera is placed by maths; the only terrain response is the pitch floor, and `roofCheck` changes which level is drawn, not where the camera is. Zone walls will clip. A ray cast from focus to camera with a pull-in is needed and is not in this donor.
- No recentring behind the hero. Yaw changes only on input (3259) and at login (1834). Frankendom will need its own rule (for example, ease yaw toward the hero's facing after a pause); this donor d
checker: No factual errors found. Checked followCamera 3222-3303 (1/16 follow, snap 500, +-24/+-12 velocity targets, halve on release, pitch 128..383, 9x9 window, x192, clamp 32768..98048, rise /24, fall /80), gameDrawMain 4182-4196 (pitch*3+600, -50 aim), camFollow 4432-4465, shake packet mapping 6356-6365 (ran/amp/rate to Axis/Ran/Amp fields is correctly described), idle drift 2366-2400, GameShell 11/158-165/185-195, touch emulation, license MIT. Sketch order and geometry match donor. Only nit: accepta

### Open-RSC-Core-Framework (copyleft, scope=world, verdict=STRONG, depth=full)
note: /private/tmp/p2/wave2-haiku/batch3/QC021/out/camera/Open-RSC-Core-Framework.deep.md
best_idea: When the camera's line back to the hero is blocked, turn it to the nearest clear compass heading instead of pulling it in, and let the follow lag grow with the camera's distance.
decision: adapt - The turn-away rule fits our world-camera clipping problem without a pull-in ray cast, but the 8 headings, the odd preference and the integer steps are tied to a tile grid, so take the shape and set headings and probe tiles from our zone collision; shape only, because AGPL.
acceptance: In a corridor with a wall behind the hero the camera turns to the open side in 31 ticks for a 45-degree turn (0.62 s at 50 Hz) and never ends a turn facing a blocked probe tile; a test asserts this for 20 scripted corridor positions.
tags: follow-point,fixed-step,accumulator,new:turn-ramp,new:compass-heading-avoid,new:zoom-scaled-lag,zoom-pulse,hysteresis
data_fields: ['follow_divisor_base', 'follow_divisor_per_zoom', 'follow_snap_gap', 'compass_headings', 'turn_min_step', 'default_zoom', 'min_zoom', 'distance_per_zoom', 'third_person_pitch', 'look_height', 'roof_zoom_pulse_amount', 'zoom_pulse_step', 'manual_yaw_rate', 'idle_sway_period', 'side_shift', 'shoulder_offset']
gaps/risks(excerpt): - Centred again. The aim point is the eased follow point, so the hero is in the middle of the frame. This donor does not give an over-the-shoulder offset; the sketch's `shoulder` is ADDED.
- No pull-in, only turn-away. The rule chooses a heading; it does not move the camera closer when no heading is clear. If all eight headings are blocked the code keeps the current heading (the search finds nothing). Frankendom needs a fallback (pull-in or a height lift); not in this donor.
- The even and odd preference (even clear headings move to an odd neighbour) was read but I could not work out the donor's intent. Do not copy the preference without a test that shows what it prevents.
- Integer steps. T
checker: none found; snap 500 (11992), divisor (zoom-500)/15+16 (12034), turn ramp (v*m_Wc+255)/256 (12025), 8 headings x32 (12001), pitch 912 (312, 18391), zoom 750/600, distance zoom*2 and height -elev-180 (5245-5246), sway >500 frames, manual yaw 2, licence AGPL all match

### runelite-runelite (permissive, scope=world, verdict=STRONG, depth=thin)
note: /private/tmp/p2/wave2-haiku/batch3/QC021/out/camera/runelite-runelite.deep.md
best_idea: A world-to-screen projection with a near-plane reject gives a cheap way to fit several targets on screen, which a many-on-one fight camera needs.
decision: adapt - The projection duplicates the renderer and the donor has no follow or shoulder camera, so take only the near-plane rule and a fit-to-box helper for framing several enemies, not the camera motion.
acceptance: With three hostiles around the hero the camera backs off until all three sit inside 80% of the view; a target behind the camera (depth under 50 units) is left out of the fit rather than pinned to the screen edge.
tags: new:screen-projection,new:near-plane-reject,new:target-box-fit,clamp-and-report
data_fields: ['near_plane_depth', 'angle_units_per_turn', 'inner_zoom_limit', 'outer_zoom_limit_min', 'camera_speed_default', 'zoom_slider_exponent', 'fit_safe_fraction']
gaps/risks(excerpt): - No camera motion in this donor. Follow, easing, shoulder offset, wall collision and recentring are all absent from the repo, so this donor cannot answer the owner's over-the-shoulder question. The motion has to come from the LostCity note or from our own design.
- Duplicate of the renderer. Frankendom's renderer already projects points; use the donor's near-plane rule and the fit helper only, never a second projection path that could disagree with the renderer.
- Two angle scales in one donor (14-bit camera, 2048-unit model rotation, Perspective 57 and 92 against 442-507). Frankendom must pick one scale; the sketch uses 16384 to match the camera tables.
- The zoom value (`client.getScale()
checker: Verified: localToCanvasCpu 214-244 order, near plane z1>=50, SINE14 = i*pi/8192 (16384 per turn), model path 2048-unit rotate tables, modelToCanvasCpu MIN_VALUE sentinel, CameraPlugin copyConfigs/applyConfigs/zoom exponent 2, CameraConfig INNER 1400, outer +-400, speed default 1, Client.java setters declared 1439/1446/1782/1795/1808, getCameraFocusEntity 2445, no camera motion impl in repo, BSD-2. Design nit: acceptance says 'camera backs off' but fitFactor scales projection scale (zoom/FOV), no

### Sziadan-open-midgard (copyleft, scope=world, verdict=STRONG, depth=full)
note: /private/tmp/p2/wave2-haiku/batch3/QC022/out/camera/Sziadan-open-midgard.deep.md
best_idea: Keep the drawn camera and the wanted camera as two separate states, move the drawn one toward the wanted one by a fixed share each step, and put every zone's camera limits (distance, latitude, locked yaw) in a small data table.
decision: adapt - The zone limit table and the wanted-versus-drawn split fit zones as data and the world camera, but the per-call 0.1 step makes the view frame-rate dependent and the terrain floor has no margin; keep the shape, change the step to dt-based and check the floor's axis sense first.
acceptance: A client test runs the same orbit at 60 Hz and 30 Hz for one simulated second and asserts the eye positions agree within 1 percent; an indoor zone test asserts a drag leaves the yaw unchanged and a wheel step never takes the distance outside the zone's min and max.
tags: follow-point,fixed-step,new:dest-current-split,new:zone-camera-limits,new:saved-camera-per-zone,new:ground-floor-eye,new:lock-yaw-indoors
data_fields: ['distance_min', 'distance_max_indoor', 'distance_max_outdoor', 'distance_default_outdoor', 'latitude_range_indoor', 'latitude_range_outdoor', 'latitude_default', 'yaw_locked_indoor', 'drag_yaw_per_px', 'drag_pitch_per_px', 'wheel_distance_per_notch', 'catch_up_share']
gaps/risks(excerpt): - Not an over-the-shoulder view. The look-at point is the player's position (`ResolveTargetPosition` 714-727; `m_dest.at` at 859), not a head point, and the boom has no lateral term (814-816). The owner's shoulder request is not supplied by this donor.
- The only collision is one terrain-height sample at the eye's x and z (819-821). No walls, buildings or objects are tested. Indoor zones rely on the maximum distance of 420 and on the locked yaw instead.
- Frame-dependent smoothing. The share is 0.1 per call (View.cpp 788-799), so the settling time depends on how often `OnUpdate` runs (driver not read). Derived: at 60 calls per second, a 0.9 share per call is about 9.5 calls (0.16 s) to 1/e; 
checker: -

### eriknihlen-OpenAC (permissive, scope=world, verdict=STRONG, depth=full)
note: /private/tmp/p2/wave2-haiku/batch3/QC022/out/camera/eriknihlen-OpenAC.deep.md
best_idea: Damp the eye toward the wanted boom spot, but start each step from the wall-clamped eye, and fade the player's body when the eye is within 0.45 m of the pivot.
decision: adapt - The donor centres the boom on the player with no shoulder offset, so the over-the-shoulder view must be added; keep the damped pull-in, the wall sweep and the near-wall fade, and do not copy its raw numbers or its Y-axis mouse filter.
acceptance: In a zone the character walks into a wall and the camera stops at the wall while the wanted eye stays on the boom line; a client test asserts the published eye is closer to the pivot than the boom length and body translucency is 1 when the eye is within 0.20 m of the pivot.
tags: follow-point,clamp-and-report,new:boom-sweep,new:translucency-fade,new:lock-on-framing,new:convergence-park,variable-step
data_fields: ['boom_distance', 'boom_pitch', 'pivot_height', 'translation_stiffness', 'rotation_stiffness', 'wall_sphere_radius', 'fade_near', 'fade_far', 'orbit_step_per_unit', 'key_adjust_speed', 'wheel_zoom_per_tick', 'mouse_smoothing_window', 'min_shrink_distance', 'max_horizontal_offset', 'vertical_offset_range', 'lock_on_height', 'slope_alignment_side_limit']
gaps/risks(excerpt): - Over-the-shoulder is NOT in the donor. The boom orbits the player's centre pivot (`RetailChaseCamera.cs` 104, 504) and no camera file has a lateral term (grep for shoulder found nothing). The owner's main ask is therefore not supplied by this donor; the sketch's shoulder offset is our addition and is untested.
- Lock-on frames one target only: `GetCombatCameraTargetPoint(selected)` (`CombatCameraTargetSource.cs` 41), gated on the "Keep in View" option and a targeted-attack mode (34-36). No framing rule for several enemies. Frankendom's many-on-one fight (MAX_ATTACKERS = 3) needs a framing rule that is designed, not copied.
- No combat zoom or FOV change, no shake, no impact punch, no recen
checker: -

### nmeylan-nostalro-client (permissive, scope=world, verdict=STRONG, depth=full)
note: /private/tmp/p2/wave2-haiku/batch3/QC022/out/camera/nmeylan-nostalro-client.deep.md
best_idea: Move the drawn camera by fixed 60 Hz steps with a band rule that divides big errors hard, medium errors softly and snaps tiny ones, and shake it with a linearly decaying offset that keeps the larger of the old and new amplitudes.
decision: adapt - The band rule, ground floor and shake stacking fit a fixed world camera, and the zone bands are zone data; but the donor's rounded step count makes speed frame-rate dependent (it runs at 60 steps per second above 120 fps), its distance divisors pop (1.0) or ring (0.6), and its indoor pitch band is inverted without Ctrl, so each is changed or left out.
acceptance: A client test asserts that a 24.3-unit wheel notch takes at least 5 camera steps to arrive, that a 4-unit distance change converges monotonically within 20 steps, and that one simulated second at 60 fps and at 144 fps ends within 1 percent of the same camera position; a shake test asserts a ScreenQuake offset of 1.5 units at trigger that decays to zero within 1.667 s.
tags: follow-point,fixed-step,new:band-follow,new:zone-camera-bands,new:ground-floor-eye,new:shake-stack,new:indoor-yaw-lock
data_fields: ['outdoor_distance_range', 'indoor_distance_range', 'pitch_band_centre', 'outdoor_pitch_half_width', 'indoor_pitch_half_width', 'indoor_yaw_fixed_and_half_width', 'interpolation_step', 'distance_big_threshold', 'distance_small_threshold', 'distance_big_divisor', 'distance_small_divisor', 'angle_big_threshold', 'angle_small_threshold', 'target_big_threshold', 'target_small_threshold', 'wheel_distance_step', 'drag_yaw_per_px', 'shake_screen_quake', 'shake_earthquake', 'shake_hit_default']
gaps/risks(excerpt): - The distance small-band divisor is 0.6 (camera.rs 82). The donor's own test set does not check distance per step. Derived and replicated in Python: a 4-unit error goes 4 to -2.67 to 1.78 to -1.19 and so on, flipping sign and shrinking by two thirds each step, about 13 steps (0.22 s) to snap. Drag-driven zoom in ctrl-drag (0.5 per pixel) lands in this band, so it rings. Do not copy 0.6.
- The distance big divisor is 1.0 (camera.rs 81): any error above 5 is applied in full in one 60 Hz step. A wheel notch of 24.3 is therefore a visible one-step pop, not a glide. The sketch uses 9.
- Indoor pitch band is inverted (camera.rs 261, 264-269). Without Ctrl the ceiling is 45 + 10 = 55 and the floor
checker: -

### guilhermelhr-unityro (copyleft, scope=world, verdict=STRONG, depth=full)
note: /private/tmp/p2/wave2-haiku/batch3/QC023/out/camera/guilhermelhr-unityro.deep.md
best_idea: A release-coast for the world camera's yaw: a fast flick keeps turning for a fixed short time and then stops, a slow drag does not coast, and pitch and zoom are clamped bands that come from zone data.
decision: adapt - Take the release coast with a threshold and the clamped pitch and distance bands; reject the per-frame mouse value times dt and the zero-lag LateUpdate follow, because our camera needs per-second rates and lag.
acceptance: A drag above the threshold, released, turns the yaw for about 0.5 s then stops (a test asserts no yaw change after 0.5 s); a slower drag does not coast; 100 wheel notches never leave the distance outside its zone-data band.
tags: follow-point,variable-step,clamp-and-report,new:inertia-coast,new:orbit-camera
data_fields: ['pitch_min_deg', 'pitch_max_deg', 'distance_default', 'distance_min', 'distance_max', 'yaw_coast_s', 'yaw_coast_threshold', 'zoom_coast_s', 'zoom_coast_threshold', 'mouse_sensitivity_yaw', 'wheel_zoom_sensitivity', 'wheel_pitch_sensitivity']
gaps/risks(excerpt): - No over-the-shoulder offset. `LookAt(target)` at the target's root transform (117) centres the character; there is no lateral offset. The shoulder offset would be our addition, as a data field.
- No smoothing of the follow. The camera position is set to the target every LateUpdate (98, 110-112), so a step or a jump in the target shows on screen at once. Frankendom needs lag; see the korangar note for a smoothed focus.
- No collision. The file has no raycast (read in full), so walls will clip. The pull-in step is ours to write.
- No lock-on, no framing of several enemies, no FOV change in combat, no shake (grep of all `Assets/Scripts`).
- The donor's own TODO (`CharacterCamera.cs` 38) says 
checker: -

### vE5li-korangar (permissive, scope=world, verdict=STRONG, depth=full)
note: /private/tmp/p2/wave2-haiku/batch3/QC023/out/camera/vE5li-korangar.deep.md
best_idea: Give the world camera its own smoothed focus that trails the character with a dead band and an exact per-second step, and keep distance and yaw as clamped targets that input moves and a timer settles.
decision: adapt - Take the decoupled, dead-banded focus smoothing and the clamped distance and yaw targets; change the step to the exact per-second fraction and add the shoulder offset, collision pull-in and target-first frame order, because the donor has none of them and the owner's complaint is the shoulder view.
acceptance: After a 10-tile walk and a stop, the remaining focus gap is 0.67 percent of the start after 1 s at both 30 fps and 144 fps (unit test within 0.01 points), and 100 wheel notches never leave the distance inside its zone-data band.
tags: follow-point,variable-step,clamp-and-report,hysteresis,new:orbit-camera,new:smoothed-value
data_fields: ['elevation_deg', 'distance_default', 'distance_min', 'distance_max', 'yaw_default_deg', 'drag_yaw_per_px', 'wheel_distance_per_unit', 'wheel_line_step', 'focus_speed', 'yaw_speed', 'distance_speed', 'dead_band', 'vertical_fov_deg']
gaps/risks(excerpt): - No over-the-shoulder offset. The focus is the player's position (`lib.rs` 3092), so the character sits at screen centre. The shoulder offset would be our addition, as a data field.
- The donor's view is a high 55 deg chase, not a shoulder view. Adopt the mechanism, not the elevation as the world default. Elevation and distance band are zone data.
- No collision. The camera is placed by offset alone (`player.rs` 91) and the whole file has no raycast. Walls will clip unless we add a pull-in step; the donor gives no example.
- No lock-on, no framing of several enemies, no FOV change in combat, no shake. A grep for shake and lock-on across `korangar/src` found nothing; the FOV is a fixed const
checker: -

### kivutar-goro (permissive, scope=world, verdict=STRONG, depth=full)
note: /private/tmp/p2/wave2-haiku/batch3/QC024/out/camera/kivutar-goro.deep.md
best_idea: A follow rig that eases its position at a per-millisecond rate and its zoom at twice that rate, with clamped zoom and pitch, gives a smooth third-person orbit whose numbers can sit in data.
decision: adapt - Take the follow easing, zoom and pitch clamps, orbit maths and decaying shake; add the shoulder offset and wall pull-in ourselves, because this donor has neither and the owner's complaint is about the over-the-shoulder view.
acceptance: In a zone the hero sits off-centre (shoulder offset), the wheel changes distance in 15-unit steps within 65 to 165, a heavy blow shakes the view for 200 ms with decaying amplitude, and a wall between eye and hero slides the eye in (a client test asserts the eye distance drops below the set distance when a blocked ray is placed).
tags: follow-point,variable-step,new:orbit-rig,new:shake-decay,new:zone-view-table
data_fields: ['follow_lerp_per_ms', 'zoom_lerp_ratio', 'zoom_min', 'zoom_max', 'zoom_default', 'wheel_zoom_step', 'pinch_scale', 'pitch_min', 'pitch_max', 'pitch_default', 'pitch_drag_per_px', 'yaw_drag_per_full_width', 'fov', 'shake_amplitude', 'shake_duration_explosion', 'shake_duration_earthquake', 'shake_delay_example', 'view_point_initial_distance', 'view_point_locks_yaw', 'view_point_distance_scope']
gaps/risks(excerpt): - Over-the-shoulder: the donor centres the look target on the player and has no lateral offset (projection at camera.go 155 uses the follow point directly). The shoulder offset the owner wants is not here and must be added (a lateral offset applied to both eye and look target).
- Wall pull-in: none in the donor (grep found no collision code in game/ or res/). The eye can go through geometry. Frankendom must add a collision pass (cast from the look target to the eye, pull the eye in on a hit); this is our design, not adopted from the donor.
- Follow target: the donor follows `actorRenderPosition` (camera.go 232; the function was not read, so whether it interpolates is unknown), not server sta
checker: -

### esponges-daoc-web (permissive, scope=world, verdict=STRONG, depth=full)
note: /private/tmp/p2/wave2-haiku/batch3/QC025/out/camera/esponges-daoc-web.deep.md
best_idea: Keep the eye on a sphere around a look-at point at a fixed fraction of character height, lift it only upward when it would sink into the ground, and let a swung camera ease back behind only while the character moves.
decision: adapt - The sphere geometry, look-at height and recentre-while-moving rule fit our world camera, but the donor's floor lift is not a pull-in toward the character, so we replace it with a sight-line pull-in before adopting the rest.
acceptance: Standing still after a right-drag keeps the swung view; walking forward it is back within 5 percent of behind in about one second; on a slope or behind a wall the eye is pulled in toward the character and a unit test asserts it never ends below ground plus clearance.
tags: follow-point,variable-step,target-score,new:recentre-while-moving,new:floor-lift-only
data_fields: ['look_at_fraction', 'start_distance', 'dist_min', 'dist_max', 'zoom_out_ratio', 'zoom_in_ratio', 'pitch_min', 'pitch_max', 'pitch_start', 'floor_clearance', 'recentre_rate', 'turn_rate', 'mouse_yaw_sens', 'mouse_tilt_sens', 'fov_vertical', 'near_follow', 'far', 'max_frame_dt', 'tab_target_range', 'tab_behind_penalty']
gaps/risks(excerpt): - No pull-in. The floor lift is upward only and checks only the ground under the eye. A camera behind a wall, or on the far side of a hill from the character, is not handled. Our camera needs a sight-line test from the look-at point to the eye, and a pull-in to the first blocking surface.
- Sphere distance is broken when the lift fires (section 1). Tests must allow it, or the pull-in must replace it.
- Linear decay (section 3) makes the recentre speed depend on frame rate. Use an exponential.
- No shoulder offset: the offset is about the character's yaw and the look-at point is on the centreline. The owner's over-the-shoulder request needs a lateral offset this donor does not have.
- No lock
checker: -

### latentcollapse-RustDAoC (copyleft, scope=world, verdict=STRONG, depth=full)
note: /private/tmp/p2/wave2-haiku/batch3/QC025/out/camera/latentcollapse-RustDAoC.deep.md
best_idea: Place the eye on a sphere around a chest-height look-at point, with yaw from the character's facing plus a free orbit offset, so the camera sits behind by default and a drag swings it without moving the character.
decision: adapt - The orbit geometry, pinned-turn compensation and wheel-set distance fit our world camera, but the donor has no collision, no damping and no shoulder offset, so those must be added before it beats the current over-the-shoulder view.
acceptance: In an open zone a player running along a wall or up a slope sees the camera pull in to the wall instead of showing inside geometry; a client unit test asserts the eye stays at the set distance at every pitch and above the feet at the pitch floor on flat ground.
tags: follow-point,variable-step,new:spherical-orbit,new:pinned-turn-compensation,new:snapback-behind
data_fields: ['look_at_height', 'start_distance', 'distance_min', 'distance_max', 'zoom_per_notch', 'pitch_min', 'pitch_max', 'pitch_start', 'look_pitch_rate', 'keyboard_turn_rate', 'mouse_sens', 'max_frame_dt', 'snapback_default']
gaps/risks(excerpt): - Licence: GPL-3.0-or-later. The sketch is written from the mechanism, not translated; the donor's source stays out of our tree.
- No collision. `follow_camera` reads no terrain and no walls. The only protection is the fixed pitch floor, which is right for flat ground only. My reading (inference from `follow_camera`, not tested): on a rise behind the camera, or against a wall, the eye can end up under or inside geometry. Our camera needs a pull-in against terrain and walls, which the donor does not give us.
- No damping. The camera is a pure function of the player pose, so it moves with the character each frame. A frame-rate-independent lag is ours to add; we should adapt, not copy the snap.
checker: -
