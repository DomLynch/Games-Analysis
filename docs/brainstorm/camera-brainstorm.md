# World Camera Brainstorm (Frankendom), v2

Source: camera-digest.md (55 notes). Scope: WORLD camera only. The Pit camera is frozen (camera_scope pit); every part below must leave Pit output byte-identical (frozen-snapshot test, see Phase 0).

v2 applies the checker report (camera-brainstorm-check.md): header claims corrected, licence-shape breaches replaced with our own values, portrait presets recomputed for 375x812, filler row dropped, tags added, Pit-isolation test added.

Rules applied: keep the idea, fix the donor defect (written "defect -> fix"). Restricted, GPL, AGPL, LGPL and leaked donors are shape only: nothing below copies donor code, constants or text. All preset values are our own starting guesses for phone tuning; none is copied from a restricted or copyleft donor, and values that used to coincide with donor constants (WoWee pull-in taus and step angle, roBrowserLegacy fade pair and FOV time, OpenAC body-fade radius, OpenMW blend time, unityro coast) have been re-derived (see "How our numbers were derived" in section 4). Camera is client-only: it never feeds hit tests, kills, target choice or the ledger (server verifies kills).

Licence tags: [P] permissive (adaptable with notice), [C] copyleft incl. GPL/LGPL/AGPL (shape only), [R] restricted/private (shape only). [?] = tag not stated in the brainstorm; confirm in the digest before any reuse.

Naming rule (from the digest): two donors may not be named in any Frankendom output. The C&C donor (GPL-3 with EA terms) must never be named in anything published, and SpacetimeDB is tagged [P, demo only] because only its demo/Blackholio folder is Apache-2.0 (repo root is BSL 1.1). This file is internal working text and uses short labels (CnC, SpacetimeDB); strip or replace those names before anything leaves the team, and the one-pager for Dom does not use them.

---

## 1. Top gems

The headline finding: only OpenMW ships a working shoulder rig (focal offset that switches sides using probes, raised in combat). Everyone else centres the hero (OpenAC, WoWee, STK, OpenLara, Valve, Ikemen...). Two small exceptions exist: jynew carries a Cinemachine prefab shoulder-offset setting (only the settings transfer), and SRB2 has a simple lateral shift in its CS_SIMPLE style. So the rig is: OpenMW's shoulder idea, plus other donors' collision, smoothing and framing parts bolted on.

| # | Gem | Donor note(s) | Why it matters for a phone MMO + fighter |
|---|-----|---------------|-------------------------------------------|
| 1 | Shoulder focal offset that eases between shoulders, chosen by side-ray probes; raised in combat | openmw [C] | The only working over-the-shoulder rig in the set. Side rays flip the shoulder away from the nearest wall, so the hero is never pinned against a wall with the camera on that side. |
| 2 | Asymmetric pull-in: wall pulls the camera in fast, give-back is slow; zoom debt repaid only after a clear spell | Kelsidavis-WoWee [R] | Should reduce slope and edge jitter (to be tested) when running along walls or past pillars. Fast-in protects the view, slow-out stops pumping. |
| 3 | Small yaw step-around before pulling in | Kelsidavis-WoWee [R] | Slides the camera around a corner instead of squashing toward the hero. Cheap, reads as intentional. Angle is our own tuning (no donor number used). |
| 4 | Damped eye that starts each step from the wall-clamped eye, plus sphere sweep, body fade when eye is near the pivot, and lock-on framing | eriknihlen-OpenAC [P] | Permissive: the closest thing to a copy-with-notice for the collision+damping core (the note says do not copy its raw numbers; we do not). Body fade solves "camera inside my head". |
| 5 | Sweep from hero to wanted spot, pull in to hit, lift by a little, sweep again; aim at a focus point ahead of the hero | ioquake-ioq3 [C], dhewm-dhewm3 [C] | Lift-on-hit gives more top-down view in tight spots, which shows more of the fight. Aim-at-focus-point keeps the hit area readable. |
| 6 | Sphere-cast from look-at point, lerp the look-at (not the camera) | gawric-Unity-Client-for-L2J [P] | Lagging the look-at gives follow lag without camera-through-wall; permissive. |
| 7 | Multi-fighter framing: dead zone around tracked extremes, tick-normalised smoothing | ikemen-engine-Ikemen-GO [P] (scope=pit in the digest; used here for the WORLD camera only, Pit stays frozen), CnC mean-then-clamp [C], SpacetimeDB group centroid + size-driven zoom [P, demo only], runelite near-plane fit-to-box [P] | The many-on-one case (MAX_ATTACKERS = 3). Ikemen gives the dead zone, SpacetimeDB the step per attacker, runelite the "all targets inside 80 percent of view" check. |
| 8 | Camera as data: ideal yaw/pitch/distance that input writes and a per-frame ease chases; zoom-in resets to behind | ValveSoftware-halflife [R], vthibault-roBrowser [C] (goal + clamp at write), Sziadan-open-midgard [C] (wanted vs drawn + zone limit table) | Single clean architecture: input writes GOAL, a smoother produces DRAWN. Makes every other part composable. |
| 9 | Speed-scaled pull-back with a floor and dt/T easing | supertuxkart-stk-code [C] | Sprint widens the view so you see what you run into. |
| 10 | Speed-scaled look-ahead with dead zone and margin clamp, glide-then-snap | CleverRaven-Cataclysm-DDA [C], hedgewars [C], exult [C] | Look-ahead on the ground plane. Zero in fights. |
| 11 | Hold-to-look override with one restore key; free look pans the same target | KsanaDock-Microverse [P], OpenDiablo2 [C], ClassicUO [P] (cursor lean), esponges-daoc-web [P] (recentre only while moving) | Phone-friendly manual look that does not fight auto-follow. |
| 12 | Render-only shake as an offset on a copy of the camera, distance falloff on impacts | Anuken-Mindustry [C], Barony [P], daggerfall-unity [P], nostalro [P] (stacking: keep the larger amplitude) | Shake can never drift the rig or touch server state. |
| 13 | Closed-form damped spring, exact for any dt; step-up and landing kicks | PixelGuys-Cubyz [C], vE5li-korangar [P] (exact per-second step, dead band) | One smoother for everything, identical at 30 and 144 fps. |
| 14 | Occluder fade (fade geometry between eye and hero instead of, or in addition to, pull-in) | MrAntares-roBrowserLegacy [C] | Lets the camera stay far in cluttered zones (our inference; the donor has no pull-in), which keeps fight readability. |
| 15 | Per-zone camera limit tables (distance, pitch band, locked yaw indoors) and per-mode remembered distance | Sziadan-open-midgard [C], nmeylan-nostalro-client [P], kivutar-goro [P], KsanaDock-Microverse [P] | Zones are data in Frankendom; this is exactly that shape. |
| 16 | Clip-gated look bias: when pinned by a wall, vertical drag tilts the view over the wall with the eye staying put | samwhosung-benilla [P] | Directly answers "wall behind me and I want to see ahead". |
| 17 | Turn-away from blocked line instead of pull-in | Open-RSC-Core-Framework [C, AGPL: shape only] | Fallback for corridors. The donor only says it avoids a pull-in ray cast; "pull-in would put the camera on the hero's head" is OUR rationale, not the donor's. |
| 18 | Lag measured as clock-time glide between confirmed steps, anchor at commit | opentibiabr-otclient [P], DevilutionX [R], UltimaXNA [C], crossuo [C] | Server-verified movement: camera glides between confirmed positions and snaps at commit. |

---

## 2. Defect -> fix table

| Donor | Defect | Fix in Frankendom |
|-------|--------|-------------------|
| openmw [C] | Shoulder view opt-in only; auto-switch is off by default; combat offset also fires for swimming; focal cast starts offset from character | Make shoulder the default; auto-switch on; tag the combat raise to fight state only; start the focal cast from the hero capsule centre, not the offset point. |
| Kelsidavis-WoWee [R] | Centred pivot (wall logic never tested from an offset point); 88-degree pitch clamp too loose | Run the pull-in cast from the shoulder-offset pivot to the eye; clamp pitch to our single follow band (-20 to +55 degrees, narrower in fight; zones override). |
| eriknihlen-OpenAC [P] | Centre pivot, lock-on frames one target only, no combat zoom, no shake | Add shoulder to the pivot; framing uses hero + up to 3 attackers; add FOV pulse and shake from other gems. |
| ioquake-ioq3 [C] / dhewm-dhewm3 [C] | No smoothing; ioq3 side-angle yaw does not aim at the focus point (pitch aimed before yaw correction) | dt-based exponential smoothing on position; compute aim by direct look-at of the focus point after all offsets. |
| gawric-L2J [P] | Distance snaps; world-space offset not rotated by heading; fixed 90-degree horizontal FOV (huge in portrait); no auto-follow | Ease pull-in out and in separately; offset in camera right/up; cap VERTICAL FOV for 375x812; ease yaw toward hero facing when moving. |
| ValveSoftware-halflife [R] | Orbits to look AT the character (centred); wall code compiled out; per-tick steps (frame-rate dependent) | Offset the look target sideways; add pull-in; dt-based ease. Keep its rear-half yaw clamp. |
| vthibault-roBrowser [C] | No shoulder, no collision; yaw/zoom writes bypass the ease in some paths | Route every write (including double-tap recentre and init) through the goal. |
| Clancey-wowrust [R] | No smoothing (dt unused), no collision, fixed zoom step coarse at small distance | Not used as a base; borrow only "rotation applies only while look is held" and scale zoom step with distance. |
| supertuxkart-stk-code [C] | No shoulder, no collision; side-offset term dead | Add shoulder and cast; leave the dead term out. |
| SRB2 [C] | Camera state lives in the server tic loop; per-tic ease is frame-rate dependent; centred (small lateral shift in CS_SIMPLE only) | Client-only; ease as `1-(1-s)^(dt*60)` (our form); proper shoulder added; keep sight-reset snap but animate it as a fast ease so it does not pop on phone. |
| Anuken-Mindustry [C] | 2D shake offset, pixel falloff constant | Shake in camera-local axes (small roll plus lateral), falloff rescaled to our world units. |
| daggerfall-unity [P] | Hit size lost after first frame; per-frame rotate; 2.5-5 s duration too long for a duel | Latch the hit's amplitude at trigger; time-based envelope; 0.15 to 0.4 s (our range). |
| Barony [P] | Ghost camera pull-back has no collision | Pull-back goes through the same cast. Keep the rate-limited eye-height setpoint. |
| MovingBlocks-Terasology [?] | Frame-count smoothing | Time constant, `1-exp(-dt/tau)`. |
| KsanaDock-Microverse [P] | Unclamped follow weight (overshoots on long frames); free-look kept on deselect | Clamp weight to 1; clear free look on target loss and zone change. |
| SpacetimeDB [P, demo only] / CnC [C] | Unclamped lerp; zero-piece state; donor frames only own pieces | Clamp; fall back to hero-only frame when no attackers; attackers are our term. |
| Ikemen-GO [P] | Edge-speed floor lets a fast enemy drag the view; 2D | Cap the leader-speed floor; do the framing in screen space of the 3D view. |
| Cataclysm-DDA [C] | Unclamped inverse-lerp gives a backward lead near zero speed | Clamp to 0..1; also zero lead when locked or in a fight. |
| hedgewars [C] | Per-pass smoothing depends on loop cadence | dt-based. |
| exult [C] | Tile-quantised glides | Screen-fraction dead box; time glide. |
| ClassicUO [P] | Picking follows the lean (clicks hit wrong tile) | Picking goes through the same inverse matrix; also lean never selects targets. |
| otclient [P] / DevilutionX [R] / UltimaXNA [C] / crossuo [C] | Camera follows predicted step; step end drops leftover time or snaps one frame early | Follow the drawn position; carry leftover time; a rejected prediction snaps focus back. Never move the hero. |
| Cubyz [C] | Unclamped client delta; no horizontal lag | Clamp dt; spring on follow point includes hero velocity as feed-forward for lag. |
| LostCityRS-Client-TS [?] | Truncating integer division; no recentre; no pull-in | Float math; recentre while moving; add pull-in. |
| Open-RSC [C, AGPL] | Heading search finds nothing when all 8 blocked; odd-preference unexplained | Fall back to pull-in plus height lift; skip the odd preference unless a test shows why. |
| roBrowserLegacy [C] | No hysteresis at the zoom threshold; FOV snaps; no pull-in | Hysteresis band; ease FOV over our own time (see presets); keep fade AND add pull-in. |
| esponges-daoc-web [P] | Floor lift is upward only; linear decay is frame-rate dependent; sphere distance broken when lift fires | Replace lift with sight-line pull-in; exponential recentre; keep distance invariant. |
| latentcollapse-RustDAoC [?] | No collision, no damping | Add both; keep pinned-turn compensation (turning while a drag is held keeps the view angle). |
| open-midgard [C] | 0.1 per call share; terrain floor has no margin | dt-based; margin on floor. |
| nostalro [P] | Divisors that pop (1.0) or ring (0.6); inverted indoor pitch band | Use a smooth divisor (our sketch value: around 9 per step); check pitch band sense with a test. |
| unityro [C] | Zero-lag LateUpdate follow; mouse value times dt | Smoothed follow; per-second rates; keep the release coast shape (own timing). |
| korangar [P] | No shoulder, no collision, frame order | Target first, then camera. |
| goro [P] | No shoulder, no pull-in | Shoulder on both eye and look target; add pull-in. |
| benilla [P] | One-sided bias (no help looking down); WoW-binary comments | Mirror the bias, or accept and say so; own numbers. |
| fallout1/2-ce [R], keeperfx [C] | Tile/screen-pixel leash; blocker flag not geometry | 3D leash box in world units; per-step sphere cast. |
| lincity-ng [C] | Debt re-applied only on next clamp (jump when constraint lifts) | Glide the debt back, do not jump. |
| pier-oliviert-lineage [R] | Snap per packet, static floor | Rejected as a base. Keep only "remote heroes glide between packets". |
| OpenXcom [C] | Hard lock labelled smooth; fixed pixel step with no catch-up | Latch-follow shape with eased catch-up. |
| OpenEnroth [C, LGPL-3.0] | Jitter writes party facing | Shake is camera-only; server test: facing unchanged. |
| OpenTESArena [?] | First-person; eye in collider | Keep update order (camera after physics, same tick) and aspect-normalised look; own pull-in. |
| Orbiter [?] | Instant chase orbit | Keep look-rate and look-accel caps and smoothstep settle only. |
| Card-Forge / isometric-city [?] | Clamp uses un-zoomed size; keyboard pan speed changes with zoom | Zoom-aware half-extent; world-unit pan. |
| OpenDiablo2 [C] | 0.85 per call; one-frame target delay | Half-life ease; set target and ease in the same frame. |

(The v1 filler row "Barony fixed-step | none material" is removed: the digest does not support it as a defect.)

---

## 3. Composable camera parts

Architecture: GOAL -> TARGET FRAME -> SOLVER -> SMOOTHER -> POST (render only). Each part is a pure function over a small state, individually switchable per preset, each testable alone.

Pipeline order each frame (after the hero's post-physics pose, same tick, from OpenTESArena shape):

1. **Inputs -> Goal**: thumb drag writes goal yaw/pitch (clamped at write); pinch writes goal distance (clamped); double-tap writes recentre. Look-rate and accel caps from Orbiter shape. Release coast (unityro shape) optional.
2. **Auto-follow yaw**: while moving and no drag active, ease goal yaw toward hero facing (esponges, Valve rear-half clamp: camera yaw stays within +-90 degrees of directly behind the hero). Pinned-turn compensation (RustDAoC): when the hero turns while a drag is held, hold the view angle.
3. **Focus point** (what the camera looks at):
   - base: hero chest height, about 0.68*H (see presets; the thumb-zone safe frame keeps the hero clear of the controls).
   - + shoulder offset in camera-right (OpenMW shape), defined as a fraction of the visible half-width at the hero (target 0.35 to 0.40), never a fixed metre value that can push the hero out of a portrait frame. State: side = left/right, eased.
   - + look-ahead (CDDA/hedgewars shape), scaled by speed, clamped, zero in fight.
   - + combat raise (OpenMW shape).
   - + group centroid pull (CnC/SpacetimeDB shape) when attackers present.
   - + lock-on bias toward locked target.
   - + cursor/touch lean (ClassicUO shape), optional.
4. **Shoulder switch**: two side rays from the hero; flip to the freer shoulder with hysteresis (switch at one distance, switch back at a larger one). Eased over about 0.5 to 0.9 s.
5. **Boom**: eye wanted = focus - view_dir * distance, with distance = base * speed pull-back * group-size widening * zone limits, always under a hard maximum (zone band max).
6. **Solver (collision)**: sphere cast from the shoulder pivot to the wanted eye; on hit pull in, lift by a fraction of the closing amount, cast again (ioq3/dhewm3 shape). Fallbacks: yaw step-around (WoWee shape), turn-away (Open-RSC shape), clip-tilt (benilla shape).
7. **Smoother**: one exact exponential/spring per channel: focus, yaw, pitch, distance, shoulder, FOV. Pull-in uses tau_in << tau_out (asymmetric, WoWee shape, our own values). Every weight clamped to 1. A lateral leash box in world units (fallout-style) caps how far smoothing lag can drop the hero from the frame.
8. **Post (render only, on a copy of the camera)**: shake stack (keep larger amplitude), hit sway, bob, FOV pulse, body fade, occluder fade. Rig state is identical before and after a shaken frame (test). These effects and the preset chooser are read by the WORLD camera only (see Pit isolation test).
9. **Safety**: bounds clamp (zone rectangle, zoom aware), snap-on-far-jump, sight-reset, dt clamp (cap at 50 ms), vertical FOV cap for portrait.

Parts list for the data table: `shoulder`, `shoulderSwitch`, `lookAhead`, `speedPullback`, `autoYaw`, `recentre`, `freeLook`, `lockOn`, `groupFrame`, `combatRaise`, `pullIn`, `stepAround`, `clipTilt`, `occluderFade`, `bodyFade`, `shake`, `fovPulse`, `bounds`, `zoneLimits`, `stepGlide`, `leash`.

All tunables are client data (per-zone overrides allowed; zone limit table from open-midgard / nostalro shape). A debug overlay shows the active parts and the current numbers so Dom can read them off his phone.

---

## 4. Switchable presets for Dom's phone

Preset switch: a 5-way chooser in a debug menu or `?cam=A..E` URL flag (look-test skill: a style flag on the existing scene, published to /preview/). Switching blends all parameters over 0.4 s so he can compare in place. The chooser and `?cam=` apply to the WORLD camera only and are ignored in Pit scenes.

All values are OUR starting guesses (our own tuning) for a 375x812 portrait view; he will tune.

Units: metres-ish world units, hero height H = 1.8. Rates are time constants (tau, seconds) so behaviour is the same at 30 and 144 fps.

How our numbers were derived (so none is a donor constant): shoulder offsets come from the portrait geometry, visible half-width = d * tan(vFOV/2) * (375/812), with the hero's far edge (offset + 0.3 m) kept inside about 85 percent of it; focus height from the feet-in-frame check (feet must stay inside half the vFOV with the combat raise on); pull-in taus, step-around angle, fade opacity and time, FOV pulse time, body-fade radius and coast time are picked on a plain scale (frame-time multiples, fractions of H) and are deliberately different from the restricted/GPL donor values the checker flagged.

Single follow pitch band for every preset unless a zone overrides it: -20 to +55 degrees (fight: -10 to +45).

### A. "Shoulder Classic" (the OpenMW answer, safe default)
Over-the-shoulder with auto shoulder switching, calm follow.
```
distance 3.2 (zone band 1.8..5.5), pitch rest 14 deg (follow band -20..55)
shoulder right 0.30 (up 0.15), switchAt wall-dist 1.6, switchBackAt 2.6, switchTime 0.7 s
focus height 0.68*H, vFOV 52 (cap 56 portrait)
tau focus 0.10, yaw 0.18, dist-out 0.50, dist-in 0.08
autoYaw while moving: tau 0.8 s, camera yaw stays within +-90 deg of directly behind the hero
combatRaise +0.15, combat tauChange 0.25
lookAhead off, groupFrame off, shake on (small)
pullIn: sphere r 0.25, lift 0.5*closing, stepAround up to 10 deg
```
Question it answers: does the shoulder feel like the thing Dom wanted? Baseline.

### B. "Duel Frame" (fight-first, many-on-one)
Shoulder weakens as attackers appear; framing widens per attacker.
```
distance base 3.6; +0.55 per attacker (cap 3 attackers); HARD MAX 5.5 (zone band max)
shoulder 0.30 alone -> 0.10 at 3 attackers (blended)
focus = weighted mean(hero w=2, attackers w=1 each), tension dead zone 12 percent of view
vFOV 52 -> +4 deg at 3 attackers (cap 56)
tau focus 0.14 in fight, 0.10 out; fight enter/exit hysteresis 1.2 s
lock-on: nearest attacker in thumb direction; frame includes it; picking never reads camera
fit rule: back off until all tracked targets inside 80 percent of the view (runelite near-plane shape), never past the hard max; fit along the screen-VERTICAL axis first (portrait width is the limit); targets behind the near plane ignored
hit shake: amplitude from hit size latched at trigger, 0.2 s, camera-local axes
```
Question: does 1-vs-3 read at 375 px?

### C. "Runner" (exploration and sprint)
Speed-aware, look-ahead, wide view.
```
distance 3.0 at rest -> 4.5 at sprint (1.5x), tau 0.25
height up 0.2 at sprint
lookAhead max 0.25 of frame height along ground travel; dead zone speed 0.5 m/s; margin clamp 15 percent
shoulder 0.25 (smaller; look-ahead already offsets)
FOV +5 deg at sprint over 0.25 s
step glide from confirmed positions (anchor at commit, snap on server correction)
bob roll 0.4 deg on footstep phase only when moving (off by default; option)
```
Question: does it feel fast without making combat harder to read?

### D. "Cinematic Lag" (heavier, filmic)
Spring with visible lag, free-look with thumb, longer settle.
```
distance 3.8, pitch rest 18, shoulder 0.40
exact damped spring on focus (omega 6, zeta 0.85), hero velocity feed-forward 0.12 s
lateral leash box 0.8 m (world units) so lag at a run never drops the hero off the frame
release coast 0.35 s after fast flick (threshold 180 deg/s)
recentre only while moving; double-tap recentre eases 0.5 s
occluderFade ON, 35 percent opacity, 200 ms; bodyFade when eye within 0.6 of pivot (one third of H)
hit sway 0.3 s, kick on landing
```
Question: is more lag charming or nauseating on a phone?

### E. "Tight Pocket" (indoors, corridors, small zones)
Close, high, minimal swing; collision-first.
```
distance 2.2 (band 1.8..3.2; minimum 1.8 so the frame is never narrower than the hero), pitch rest 28 (follow band -20..55)
shoulder 0.15, scaled with distance (0.07*d) and shrinking as pull-in shortens; switch hysteresis wider (1.2 / 2.0) to avoid flipping in corridors
pullIn tau_in 0.05, tau_out 0.55, lift 0.7*closing, clipTilt ON, turnAway ON, occluder fade ON; hero fade on if pulled below the minimum
yaw locked within +-35 of zone's yaw if zone sets lockYaw (open-midgard/nostalro shape)
vFOV 56 (cap 60)
```
Question: do tight spaces stop feeling like a camera fight?

A is the default; B is the likely fight choice; C/D are feel experiments; E is a per-zone override target.

---

## 5. Novel ideas (beyond the donors)

1. **Thumb-side shoulder**: the shoulder follows which thumb is dragging the look (right thumb holds -> camera on the right shoulder). Left-handed players get the mirror free. Hysteresis so a stray touch does not flip it.
2. **Fight-lock hold**: when a fighter is locked, the shoulder auto-sets to put the locked target in the open half of the frame (opposite the shoulder). The camera lens chooses the shoulder for readability, not for walls.
3. **Silhouette guarantee**: every frame, sample the hero capsule and each tracked attacker's capsule against the occluder list; if one is more than 30 percent hidden, nudge the shoulder/pitch, then fade the occluder as last resort. Hero stays visible, matching OpenAC's body fade logic in reverse.
4. **Recoil punch by weight class**: heavy weapons give a longer, lower shake; light give a short high shake. Table keyed by weapon tag; amplitude latched at trigger (fixes the daggerfall defect).
5. **Impact FOV pulse with direction**: hits from the left lean the camera a degree right for 120 ms (camera-local roll), reading the direction of damage on a small screen.
6. **Finisher whip**: for a kill, ease to a short low orbit around the victim for 0.8 s, then return. Render-only; skippable; never shifts picking.
7. **Dodge peek**: on dodge, shoulder swaps to the opposite side for the dodge duration, giving a wide view of where the hero landed.
8. **Block squeeze**: while blocking, distance shortens 8 percent and the shoulder slides toward centre, giving a "guarded" feel.
9. **Edge-of-world lean**: near a zone edge or cliff, the camera tilts down a few degrees (pitch bias toward the drop) so the player sees the edge before reaching it.
10. **Group-regroup camera**: in towns with many remote heroes, frame dynamically stays on the hero but briefly widens when a remote hero in the party leaves the frame beyond 3 m (a "party tether").
11. **Thumb-zone safe frame** (first-class part, not optional): the focus is biased up by the height of the thumb-controls zone so the hero never sits under the on-screen joystick or buttons. Measured from the actual HUD rect.
12. **Portrait/landscape morph**: rotating the phone changes vertical FOV and shoulder width together so the horizontal view cone stays constant.
13. **Camera memory per zone** (open-midgard shape): last distance and pitch per zone, restored on re-entry, easing in over 1 s.
14. **Auto horizon bias**: when pitch is low, add a small vertical shift so the horizon stays at a third of the frame; avoids all-sky or all-floor views.
15. **Spectator share**: replay the last 3 s of camera path on death (from stored pose samples) as a free cinematic.
16. **Network-glide for remotes**: when a remote hero is the lock target, the camera frames its drawn (interpolated) position, never its jittery packet position (UltimaXNA/otclient shape).
17. **Tap-to-peek**: tap-and-hold on the edge of the screen pushes the look-ahead there (cursor lean, ClassicUO shape) while a tap on a target locks it; picking stays independent of the lean.
18. **Cover assist**: when the hero is within 0.6 m of a wall and idle, the shoulder switches to the open side and distance shortens 10 percent (a gentle "I'm hugging a wall" pose).
19. **Frame budget governor**: on a hitch (dt > 50 ms) the camera drops to its cheap path (no occluder fade, no group fit) for 1 s, so the camera never contributes to a bad frame.
20. **Tilt-assist look**: device-motion tilt adds up to 3 degrees of yaw/pitch bias (optional, off by default), a free "lean in" for phone players.
21. **Calm camera switch**: an accessibility option: no shake, no FOV pulse, no bob, half lag. Reads from the same data.
22. **Mini-fight zoom cut**: in the first 0.3 s of a new fight, a quick distance dip (6 percent) tells the player the fight state has begun.

---

## 6. Experiment plan

Goal: let Dom judge on his phone within one afternoon, then pick by data. Each step is small, behind a flag, no release rows, no lock (look-test skill).

Phase 0 (half day): **Rig skeleton.** Goal/solver/smoother split with presets as data. Unit tests: dt-independence (60 Hz vs 30 Hz within 5 percent), all weights clamped to 1, shake leaves the rig unchanged, camera never inside wall for 60 sampled poses, and the Pit isolation test:

> **Pit isolation test (explicit):** with every preset A..E selected and every post effect on (shake, FOV pulse, bob, hit sway, body fade, occluder fade), and with `?cam=A..E` present in the URL, the Pit camera output stays byte-identical to the frozen Pit snapshot. The preset chooser, the shake stack and the FOV stack never reach the Pit camera; `?cam=` is ignored in Pit scenes.

Phase 1: **Preset A** with shoulder + pull-in + smoothing. Publish to /preview/. Dom plays 10 minutes. He answers: does the shoulder feel right, which shoulder is default?
Phase 2: **Fight parts** (B): lock-on, group frame, hit shake. 1-vs-3 bot fight stills at 375 wide (visual-pr-stills rule: ready idle and mid-fight, before and after).
Phase 3: **Presets C, D, E** as extra values of the same table. 5-way chooser in the debug menu.
Phase 4: **A/B logging**: client-only counters (no server impact): shoulder flips per minute, pull-in events per minute, frames with hero >30 percent occluded, time with any tracked target off-screen. Dom's rating on a one-tap thumbs panel per preset.
Phase 5: **Decision**: pick default and per-zone overrides; promote only the parts that moved a metric or earned a thumbs-up.

Tests to add per part (client only, headless): shoulder switch hysteresis (no flip inside the band), asymmetric pull (fast in, slow out), group frame monotone in attacker count and never past the hard max, look-ahead zero at low speed and in fights, stepGlide equals from/mid/to at 0/50/100 percent, portrait FOV cap, hero fully inside the 375x812 frame for each preset's shoulder at its min and max distance, bounds clamp with zoom, picking unchanged with lean, lateral leash holds the hero in frame at a 5 m/s run (Preset D).

Run heavy stuff (Playwright stills, full suites) on the VPS per standing rule; phone checks on the real iPhone via the preview URL.

Risks: (1) shoulder offset plus on-screen thumb controls can hide the hero; mitigate with the thumb-zone safe frame (idea 11). (2) Pull-in needs the zone collision on the client; check the sweep radius matches the zone collision (benilla caution). (3) Phone GPU: occluder fade and shadows cost; governor idea 19. (4) Motion sickness: calm-camera switch (idea 21).

---

## 7. Questions for Dom (max 6)

1. Which side is the default shoulder, or should it follow the thumb that is dragging (idea 1)? Lefty mode?
2. In a fight, do you want the hero to stay slightly off-centre (shoulder) or move toward centre as enemies arrive (Preset B)?
3. How much lag is charming: crisp (about 0.1 s) or filmic (about 0.25 s)? Choose between A and D.
4. Is thumb-drag free look wanted all the time, or only when you hold a button (hold-to-look with a restore double-tap)?
5. When a wall is behind you: pull the camera in (Preset E), fade the wall (D), or turn the view to the open side?
6. Is a small shake and FOV pulse on heavy hits welcome, or should the default be calm with shake as an option?
