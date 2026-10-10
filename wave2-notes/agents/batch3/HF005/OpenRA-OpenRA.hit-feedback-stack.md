# OpenRA-OpenRA: hit-feedback-stack (HF005)

Donor: /mnt/frankendom-donors/OpenRA-OpenRA (VPS, read only). Verdict: STRONG (idea), decision: adapt (idea).
Licence: code GPL-3.0 (COPYING; README.md:54). Content: Westwood-era art, audio and maps, no asset licence in the repo. Clean-room, shape only.
Depth: full for the impact chain, the screen shake, the flash and the recoil. thin for the render layer.
Half read: both. Code half: OpenRA.Game and OpenRA.Mods.Common (cited files only). Data half: mods/cnc, mods/ts, mods/d2k YAML (cited lines only).
Checked: opened 13 candidate files: OpenRA.Game/Traits/World/ScreenShaker.cs, OpenRA.Game/GameRules/WeaponInfo.cs, OpenRA.Game/Effects/DelayedImpact.cs, OpenRA.Mods.Common/Warheads/ShakeScreenWarhead.cs, OpenRA.Mods.Common/Warheads/FlashEffectWarhead.cs, OpenRA.Mods.Common/Warheads/FlashTargetsInRadiusWarhead.cs, OpenRA.Mods.Common/Warheads/CreateEffectWarhead.cs, OpenRA.Mods.Common/Effects/FlashTarget.cs, OpenRA.Mods.Common/Traits/PaletteEffects/FlashPostProcessEffect.cs, OpenRA.Mods.Common/Traits/Armament.cs, OpenRA.Mods.Common/Traits/ShakeOnDeath.cs, OpenRA.Game/Traits/TraitsInterfaces.cs, OpenRA.Mods.Common/Traits/Render/WithDamageOverlay.cs (header only). Confidence high on order and numbers for the code read. Medium on exact frame timing (not profiled). A grep for hit-stop, hitstop, knockback and shake across .cs, .yaml, .ftl and .lua found no hit-stop and no unit knockback.
Lands in: src/fight/hit-feedback.ts (proposed name, repo not checked), row 10 (hit impact and hitstop).

## 1. What the player sees and feels

- A hit lands with a short white blink on the struck unit. It is two on-off pulses, four ticks in total, so it reads as a sharp strobe rather than a fade (FlashTarget.cs:59, 65).
- A heavy weapon or a superweapon hit shakes the whole view for about a second. The shake is a fast Lissajous wobble, not a slow sway, and it is strongest when the impact is near the centre of the screen (ScreenShaker.cs:70-72, 84-87).
- A dying unit or building shakes the view for 10 ticks at low intensity (ShakeOnDeath.cs:22-23, 41).
- Vehicles kick back on the shot: the muzzle offset moves backwards by the recoil value and the recoil drains each tick by the recovery value. Nothing is pushed in the world (Armament.cs:51-55, 225, 357, 404).
- An impact puts a sprite explosion at the hit point and plays one random impact sound from a list, with a chance below 100 percent (CreateEffectWarhead.cs:133-134).
- On a 375-wide phone a screen shake of the superweapon size can hide the unit silhouettes for its whole duration. The donor's own screen shake is only used on a handful of weapon lines (see the counts in section 3).

## 2. Why it works / is striking

- Readable at 375 wide: the flash only touches the struck unit (or units in a radius), so the blink is the one thing that changes on the crowd. Pass: blink reads from a distance.
- One signature behaviour: a warhead chain. Each weapon is a list of warheads that run in order on impact, and each warhead does one job (damage, smudge, particle, sound, shake, flash). The list is the whole feedback system for that weapon.
- One signature sound: a random pick from the impact-sound list with a per-shot chance (CreateEffectWarhead.cs:133-134).
- Could be made ours at 20-30 percent resemblance: yes. The chain, the flash cadence and the shake decay are all data. We keep the shape and draw our own art and sounds.

## 3. The rule behind it

Order of operations when a shot lands:

1. The weapon's warheads are read from the YAML in node order. Only nodes whose key starts with "Warhead" are read, and the loader does not sort them (WeaponInfo.cs:164). The numbered prefixes in the donor's YAML (1Dam, 2Smu, 3Eff) are naming only; the file order is what runs.
2. Impact loops the warheads in that order (WeaponInfo.cs:238). A warhead with a delay above zero is queued as a delayed impact. It counts down one tick at a time and runs at frame end when the count reaches zero (WeaponInfo.cs:240; DelayedImpact.cs:37). Delay is an integer in ticks (TraitsInterfaces.cs:561).
3. Damage and smudge warheads run first in the example ballistic weapon, then the explosion sprite and impact sound (ballistics.yaml:9, 18, 21). All run in the same tick unless one has a delay.
4. A shake warhead adds an effect to the world's ScreenShaker, with an expiry tick, a centre point, an intensity and a per-axis multiplier (ShakeScreenWarhead.cs:32). Each tick the shaker sums the active effects, clamps the multiplier to plus or minus 3, and sets the view offset (ScreenShaker.cs:23-24, 77-78). Intensity falls off with the square of the distance from the impact to the view centre and is capped at 10 (ScreenShaker.cs:84-87).
5. A flash-on-hit warhead adds a FlashTarget to each victim at frame end (FlashTargetsInRadiusWarhead.cs:48, 55-57). A new flash on the same actor removes the old one, so the last hit wins and flashes do not stack (FlashTarget.cs:40).
6. A screen flash warhead calls Enable on the world-level post-process effect with a duration (FlashEffectWarhead.cs:30-32). The post-process blend falls from one to zero over a fixed length of 20 ticks by default (FlashPostProcessEffect.cs:24, 57).
7. Recoil is set to the weapon's recoil value at the moment the shot fires (Armament.cs:357) and drops by the recovery each tick, never below zero (Armament.cs:225).

Designer-tunable data fields (donor value null because the donor is GPL; the numbers below are for reading only):

- flash_blink_count (flashes per hit): default 2
- flash_blink_interval (ticks between blinks): default 2
- flash_alpha (0 to 1): default 0.5
- flash_colour (name, not a code): white by default
- screen_flash_length (ticks): default 20
- shake_duration (ticks): superweapon example 20; death example 10
- shake_intensity (game units, capped at 10): superweapon example 5; death example 1
- shake_axis_multiplier (per axis, clamped to plus or minus 3): default 1,1
- shake_falloff: inverse square of distance from impact to view centre
- recoil_kick (WDist units): vehicle examples 48 to 170 (cnc vehicles.yaml:157, 599)
- recoil_recovery_per_tick (WDist units): default 9 (Armament.cs:55); vehicle examples 18 and 42
- warhead_delay (ticks): integer, default 0
- impact_sound_chance (percent): default 100

Counts from the data half (mods/ tree, grep counts):
- ShakeScreen warhead: 6 lines in 5 files.
- FlashEffect warhead: 10 lines.
- FlashTargetsInRadius warhead: 4 lines (ts healweapons.yaml:8, 25).
- ShakeOnDeath trait: 12 lines.
- Recoil values set on an armament: 24 lines.
- Warhead@ keys under mods/ (weapons and maps together): 661 lines.

## 4. For Frankendom

- Shape: a server-verified hit runs one list of feedback steps. The engine decides the hit and its warheads; the client only plays the blink, the shake and the sound. That matches our rule that the camera, HUD and sound are client-only.
- 700 zones as data: the warhead list and the shake and flash numbers live in data, so a zone or a creature family can reuse one chain with different numbers. The 100 Pit creatures can share the same chain with a different sound and sprite.
- Many-vs-one (max 3 attackers): the flash rule that the last hit wins is the rule we need. With three attackers, each hit restarts the same blink, so the target flashes at the rate of the latest hit and does not pile up. Keep it.
- What to keep: the ordered warhead list, the flash that replaces the old flash, the shake that falls off with distance, the per-shot sound chance.
- What to change: (a) the flash blend is wrong for short durations (defect below), (b) the shake switches off in one step at expiry, with no decay.
- Hit stop: the donor has none. Do not add a sim pause. If we want a freeze, do it on the client by holding the render of the two actors for N frames while the server keeps ticking.
- Lands in: src/fight/hit-feedback.ts, row 10 (hit impact and hitstop). Row 11 (fight camera) takes the shake.

Defects found, with fixes (keep the idea, fix the defect):

- Short screen flash starts too weak. FlashPostProcessEffect.cs:57 divides the remaining frames by the fixed Length (20), not by the duration that was set. A duration of 5 gives a first blend of 4/20 = 0.2, so the flash peaks at 0.2 instead of 1. Fix: store the duration in Enable(), and set blend = remaining / duration.
- Screen flash starts with a stale blend. Enable() sets the counter but not the blend, so frames drawn before the next tick use the last blend value (FlashPostProcessEffect.cs:46-52, 54-58). Fix: set blend = 1 inside Enable().
- Shake switches off in one step. ScreenShaker.cs:46 removes an effect on its expiry tick and the offset returns to zero at once. Fix: scale intensity by remaining / duration over the last part of the effect.

## 5. Five-minute look test (Dom, on the phone at 375 wide)

Build one fake hit on a single test unit in the fight camera. Three variants side by side, same enemy, same hit:
- A: blink only (2 pulses, 4 ticks, alpha 0.5).
- B: blink plus a 20-tick shake at intensity 5 (the donor's superweapon values, not copied) with the decay fix.
- C: blink plus a 10-tick death shake at intensity 1.
Compare: can you still read the enemy silhouette during the blink and the shake? Does the blink tell you which enemy you hit when three enemies are close?

## 6. Licence and IP

- Code: GPL-3.0 (COPYING; README.md:54). Clean-room only. We adapt the chain shape, the cadence and the decay idea. We do not copy code.
- Content: Westwood-era sprites, sounds and maps; the repo states no asset licence, and map files name Westwood Studios as author. Inspiration stays at category level: "a short white blink on a hit", "a brief view shake on a heavy hit". No sprites, sounds or map names.
- Recreate as an original: keep the warhead-list shape and the flash-replaces-flash rule; change the names, art, sounds and numbers.
- No legal conclusions.

## 7. Gaps

- Not read: DamageWarhead and SpreadDamageWarhead internals (the damage maths), SpriteEffect and the animation renderer, the bullet and projectile hit path, WithDamageOverlay body (only the header), Health.cs, SoundOnDamageTransition.cs.
- Not in the half I read: the client half's sound mixer and how a sound is chosen per listener (not read).
- Half read: both halves for the impact chain. The render-side flash path is read only as far as FlashTarget.Render and the post-process Enable.
- Death and respawn presentation beyond ShakeOnDeath: not read.
- Walk density, idle animation, loot reveal: not in scope of this topic.
- Readability at 375 wide: not measured; the look test above is the check.
