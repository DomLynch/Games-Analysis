# Warzone2100-warzone2100 (hit-feedback-stack, feel note, cell HF004)

Donor/Licence: /mnt/frankendom-donors/Warzone2100-warzone2100 (VPS). COPYING line 2 is the GPL v2 text ("Version 2, June 1991"). Clean-room, shape only. No code adapted. Donor numbers are not written into data fields (GPL donor).

Checked: Read src/display.cpp (shake table, shakeStart, shakeUpdate), src/feature.cpp (destroyFeature), src/structure.cpp (structure death shakes), src/projectile.cpp (proj_ImpactFunc, objectShimmy, justBeenHitByEW), src/combat.cpp (objDamage hit stamp), src/droid.cpp (getRecoil, removeDroidFX, destroyDroid), src/component.cpp (destroyFXDroid), src/radar.cpp (hit blink), src/stats.cpp (impact sound load), src/keybind.cpp (shake toggle label), lib/gamelib/gtime.h (tick rate = 1000 per second), data/base/stats/weapons.json (109 weapon entries, parsed for counts). Confidence: high on the impact order, the timing numbers and the defects; medium on which camera axis the shake writes (playerPos.r.z, camera model not traced). Verdict: STRONG (opened real code, order and numbers explained, self-contained, re-expressible in a fast browser game).

Half read: both. One tree holds the simulation (projectile, combat, droid, feature, structure) and the client display (display, component, radar) plus the data pack (data/base/stats/weapons.json). Paired donor: none needed.

## 1. What the player sees and feels
A big hit or a big building death gives the whole view a short jolt that dies away in a fraction of a second. The jolt is longest for the top-tier buildings (HQ, power generator, silo), shorter for factories and extractors, and small for a skyscraper feature. A weapon mount kicks back and settles inside a quarter of a second after each shot. When a unit dies it bursts into five pieces of its own debris that keep the momentum it had, painted in the owner colour, with one explosion sound. An electronic-warfare hit makes the struck unit or building shiver for a fifth of a second. The selected player's radar blinks the struck unit for two seconds. The code I read has no hit stop, no knockback, and no flash on the victim unit itself.

## 2. Why it works and what is striking
- Readable at 375 wide: the death burst and the mount kick are large shapes that sit where the eye already is. (Judgement from the code, not played.)
- One signature behaviour: debris carries the momentum the unit had when it died (droid.cpp 665).
- One signature sound: the impact sound is a per-weapon key, set from the weapon's explosion sound (stats.cpp 614-620), with no sound when the weapon has none.
- Could be made ours at 20-30 percent resemblance: yes. Keep the contact order and the momentum-carrying debris. Change the view jolt.
- Criteria: silhouette yes; one behaviour yes; one sound yes; resemblance yes.

Best transferable idea: stamp every presentation event with the authoritative impact tick, so the client plays sound, flash, shake and debris from one timestamp instead of from when the message arrives.

## 3. The rule behind it
Order inside one projectile impact (src/projectile.cpp, proj_ImpactFunc), all on the impact tick:
1. Impact sound at the impact point (line 1185). If the weapon has no explosion sound, only a machine-gun ricochet plays (1173-1180).
2. Explosion effects stamped with the projectile's own time, not the current time (1246 miss, 1288 hit). Count and size come from the weapon stats.
3. Direct damage (1347). Inside objDamage the victim's hit time and weapon class are stamped first (combat.cpp 458-461). An EMP stamp is not overwritten by a plain hit (458).
4. Splash is not resolved here. The projectile moves to a post-impact state (1374 or 1398) and sweeps the radius on a later tick (1389).

Screen shake (separate from the impact):
- Five call sites: feature.cpp 524 (skyscraper, 250 ms); structure.cpp 4879 (HQ, power generator, silo, 1500 ms), 4885 (command, VTOL factory, cyborg factory, factory, 750 ms), 4888 (resource extractor, 400 ms); projectile.cpp 1209 (sat laser, 1800 ms). Structure shakes need the spot to be on screen (structure.cpp checks clipXY first).
- Shape: a 100-step lookup table (display.cpp 169) indexed by percent of the shake's length, written into the player camera's z rotation (display.cpp 280). Table comment reads as hand-tuned.
- Gate: a new shake is ignored while one is running (display.cpp 255). First one wins.
- Clock: the shake start uses the current game time at the call, not the impact tick (display.cpp 258).
- Droid deaths do not call shakeStart (the five call sites above are the only ones in src), though the toggle label says "when things die" (keybind.cpp 2410).

Recoil: a triangle envelope over DEFAULT_RECOIL_TIME = 250 ms after each shot (droid.cpp 83, 1435-1440). Peak is recoilValue / 10. When drawn, the weapon mount is offset by one third of the current recoil and the weapon by the full current recoil (display3d.cpp 2815-2832, read in part).

EW shimmy: applied for 200 ms after an electronic hit (projectile.h 46; projectile.cpp 1845-1862). Three random tilts, each within plus or minus half of DEG(1) (display3ddef.h 38-39). Droids also get a sideways jitter of about one unit (projectile.cpp 1887). Applied to features, structures and droids (display3d.cpp 2574, 3029; component.cpp 1030).

Death (droid.cpp removeDroidFX, line 665 onward): returns at once if the unit is not visible. Velocity = motion times 0.9 (DROID_EXPLOSION_VELOCITY_FACTOR, droid.cpp 86). Five debris pieces (component.cpp 1077-1137). One destruction effect at the impact tick (droid.cpp 690). One explosion sound (692). The impact tick is asserted to lie in the last frame (droid.cpp 698).

Data (weapons.json, 109 entries): 81 entries carry a numeric recoilValue, range 10 to 250, median 25. Per weapon also: numExplosions, effectSize, radius, explosionWav. Example Cannon1Mk1: recoilValue 100, numExplosions 2, effectSize 30, explosionWav smlexpl.ogg (weapons.json 955-985).

Designer data fields (no donor values, GPL donor). Names and units only:
- shake_ms_small, shake_ms_medium, shake_ms_large, shake_ms_huge (ms, one per event class)
- shake_amplitude (px on phone, not roll degrees)
- shake_curve_samples (count)
- recoil_window_ms (ms)
- recoil_peak_per_weapon (units, from weapon catalogue)
- ew_tilt_window_ms (ms), ew_tilt_max (deg)
- hit_notice_ms (ms, own fighters only)
- death_velocity_carry (factor)
- death_debris_pieces (count)
- explosion_count and explosion_size (count, size) per weapon
- impact_sound_key (sound key, null means silent)

## 4. For Frankendom
- Our ruling: the server verifies the hit, the client presents it. Warzone already splits it this way: the simulation stamps the impact tick and the display plays effects from that stamp. Keep: every hit event carries the server impact tick, and the client plays sound, flash, shake and debris at offsets from that tick. Never from its own arrival time.
- Many-on-one (max 3 attackers): three hits landing in one window must not stack three shakes or three flashes on one target. Keep one reaction per target per window and let the strongest class win. Keep the sticky rule: a status-class hit (stun, EMP-like) is not overwritten by a plain hit until the status ends (combat.cpp 458).
- Zones as data: shake class, recoil value, explosion sound and debris count are per-weapon or per-creature catalogue fields, as weapons.json does. A Pit creature family can reuse one envelope with its own numbers.
- Keep: debris carries momentum; contact order; recoil envelope; a two-second hit notice for the player's own fighters.
- Change: shake from roll to a small translation capped for a 375 px screen; replace the 100-entry hand table with a generated ramp-in, hold, ramp-out curve; stamp shake start with the impact tick; replace first-wins with later-end and larger-amplitude; seed the tilt from object id and tick.
- Death/respawn: the debris burst is the death presentation. Respawn is not in the code I read.

Defects, each with the fix:
- D1 first-wins shake gate (display.cpp 255): a big shake is dropped while a small one runs. Fix: keep the later end time and the larger amplitude.
- D2 shake clock is gameTime at call (display.cpp 258): the shake can start after the visible impact. Fix: pass the impact tick.
- D3 rand() inside the draw path (projectile.cpp 1887; display3ddef.h 39, macro expands to rand three times): the tilt re-rolls every draw and cannot be replayed. Fix: seed from object id and tick.
- D4 roll-only shake from a hand table (display.cpp 167-169): rolls the whole view and will feel wrong at phone scale. Fix: translation capped to a few px, generated curve.
- D5 label and behaviour disagree (keybind.cpp 2410; no shakeStart in droid.cpp): the toggle promises shakes for deaths but droid deaths do not shake. Fix: give droid death a small class, or relabel the toggle.

Parity row for the target: row 10 (hit impact and hitstop). Target file (proposed, client only): src/fight/hitFeedback.ts.

## 5. Five-minute look test (Dom, on his phone)
Build behind a presentation-only flag, for example feel.impact. No release rows and no lock. Publish three short clips of the same three-on-one fight at 375 wide, fight camera:
- A: today's feel (sound and flash only).
- B: A plus a 250 ms translation shake, capped at about 4 px, on heavy hits only.
- C: B plus the recoil kick on the attacker's weapon for 250 ms.
Dom judges: can he still tell which of the three attackers swung next (the telegraph), and does B or C hide the next hit. He picks one. Nothing ships from the look test.

## 6. Licence and IP
GPL v2 (COPYING line 2). Clean-room. Take the shape only: contact order, momentum-carrying debris, recoil envelope, one-stamp-per-target rule. No code, no hand table, no donor numbers in data fields, no strings copied beyond the idea of a toggle.

## 7. Gaps
- Not read: compPersonToBits (personnel death), the body of addEffect and the effect models, the EW branch around lines 1296-1322 beyond the call, the camera model (axis of playerPos.r.z not traced), multiplayer-only damage paths, the recoil use on the barrel beyond the lines quoted.
- Not in this donor: a hit stop and a knockback. A grep over src for hitstop, hit_stop and knockback returned nothing. No flash on the victim was found; the only flash is the radar blink.
- Idle and ambient animation: not read. Loot reveal: not in the code read. Walk density: not applicable (RTS). Readability: judged from code, not played; max enemies per frame not read.
- Half read: both halves of this tree; the data pack is weapons.json only (other stats files not read).

Reuse tag: no existing Frankendom module found in this box. The impact-tick stamp pattern is the piece to reuse.
Brief rule served: feel note with the rule as data fields; judged by reading the code.
