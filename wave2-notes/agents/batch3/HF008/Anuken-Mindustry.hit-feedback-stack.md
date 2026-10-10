# Anuken-Mindustry: hit-feedback-stack (HF008)

Donor: /mnt/frankendom-donors/Anuken-Mindustry (read-only, VPS)
Licence: code is GNU GPL v3 (LICENSE line 1 "GNU GENERAL PUBLIC LICENSE"). Assets carry no licence statement (see AU004). GPL means clean-room, shape only: no donor numbers in the data fields, no donor art or sound.
Checked: read the bullet hit path in core (BulletComp.collision, BulletType.hit / hitEntity, PhysicsComp.impulse, HealthComp hit flash, Renderer.shake, Effect.shake, Fx.hitBulletSmall, UnitType mech draw). Confidence high on order of operations and on the numbers as stated. Medium on the falloff clamp in Effect.shake (the arc library Mathf.clamp is not read; assumed 0 to 1). A grep of core/src/mindustry for hitstop, hitStop, hitPause and hitFreeze found no matches.
Half read: both. Core logic (sim side: BulletType, HealthComp, PhysicsComp) and core client effects (Renderer, Effect, Fx). The server/ module and the android, desktop and ios launchers were not read.
Decision: adapt (idea). Defects below are fixed in our shape. Not rejected.

## 1. What the player sees and feels
A bullet that lands throws a small white burst at the impact point: a ring that grows and about five short strokes that fly outward, gone in 14 ticks. The same frame plays a click with a slightly random pitch and gives the screen one small nudge in a random direction. On a mech-type unit (the path read; other unit draw paths not read) the body turns white at once and fades back over about 9 ticks, so the flash reads as "I was hit" without hiding its shape. The unit is pushed away from the bullet, and heavier units move less. Nothing freezes. Everything keeps moving through the hit, and the feedback is over before the next swing.

## 2. Why it works, or why it is striking
- Readable at 375 wide: the burst is small and short (14 ticks), so it does not hide the silhouette. The white flash is the one silhouette cue on hit.
- One signature behaviour: knockback from the bullet direction, divided by mass (PhysicsComp, the mass rule). A small unit flies and a big unit barely moves, with no extra code per unit.
- One signature sound: a click with a random pitch range (BulletType hitSoundPitchRange), so repeated hits never sound identical.
- Could be made ours at 20 to 30 percent resemblance: yes. The flash timing, the repeat rule for damage over time, and the max-merge shake are the transferable parts. The burst shape is generic; ours would use our own strokes and palette.

## 3. The rule behind it
Order on one bullet hit (BulletComp.collision):
1. type.hit runs first (line 133). It plays the hit effect at the impact point (BulletType 563), the hit sound with random pitch (564), the camera shake (566), then fragments, puddles, fire, unit spawns and suppression.
2. The bullet is removed unless it pierces (BulletComp).
3. type.hitEntity runs second (line 143). It applies damage (armour multiplier, shield cap, lifesteal), then the knockback impulse (BulletType 517), then the status chance and the damage event.

Flash rule (HealthComp): a damage call sets hitTime to 1 (line 75). Each tick hitTime drops by delta over 9 (line 9 and line 26). The mech draw path mixes white in by hitTime (UnitType 1967). Damage over time (line 92) passes "withEffect" only when hitTime has fallen to -1 or lower. From 1 down to -1 at 1/9 per tick takes 18 ticks, so that is the gate. Between those points the damage-over-time call restores the old hitTime (HealthComp damage with withEffect false). So a continuous hazard flashes about every 18 ticks (0.3 s at 60 ticks per second), not every frame. A normal hit (line 75 path, no gate) always resets to full.

Shake rule (Renderer, line 86): intensity is the max of the current value and the new one, capped at 100. Duration is also the max. Decay is linear, so the reduction per tick is intensity over duration. Each frame the offset is a random direction, with magnitude random(intensity) times the player setting over 4, times 0.75 (lines 210 and 211). Effect.shake (line 207) multiplies intensity by a falloff with distance from the camera, using shakeFalloff 10000 (line 21). The shake is skipped when headless (Effect.java shake).

Hit effect sizing: the hit effect is an Effect with 14 ticks (Fx.java line 855). Shake on a hit comes from the bullet type (hitShake default line 207 of BulletType). Some content sets it, for example 10 on one bullet (UnitTypes 1007).

Designer-tunable data fields (donor value null: GPL):
- hit_effect_ms, unit ms, donor null
- hit_flash_ms, unit ms (flash decay from full white to none), donor null
- dot_flash_gate_ms, unit ms (minimum gap between flashes for damage over time), donor null
- hit_shake_intensity, unit px per hit, per bullet type, donor null
- hit_shake_duration_ms, unit ms, donor null
- shake_intensity_cap, unit px, donor null
- shake_falloff_scale, unit world units, donor null
- screenshake_setting, unit multiplier (range 0 to 2, default 1), donor null
- hit_sound_pitch_jitter, unit fraction of pitch, donor null
- knockback_base, unit px per impulse step, donor null
- knockback_mass_rule, unit size squared times pi (mass), donor null
- knockback_multiplier, unit ratio (0 means immune), donor null

## 4. For Frankendom
Target file: src/fight/hit-feedback.ts (proposed module; the existing src/fight modules were not checked against the repo). Parity row 10 (hit impact and hitstop). This is presentation only. Engine and kills stay as they are.

How it maps to our shape:
- Server-verified: in the donor the hit runs in the simulation. In ours the burst, click, flash and shake must be triggered by the server-confirmed hit event, never by the client guessing. The donor fires its visual before the damage is applied. For us that is a defect, because a rejected hit would already have shown. Fix: fire the visual from the confirmed event, in the donor's order (visual, sound, shake), then the damage display.
- Many-vs-one (max 3 attackers): the shake is a max-merge, not a sum, so three hits in one tick give one shake. Keep it. The flash should follow the donor's gate idea: re-flash the target at most once per gate window (18 ticks in the donor), however many attackers hit. Note the donor's gate applies to damage over time only; a plain hit always resets, so for us the gate would be a choice, not a copy. A cap on hit voices per target per tick is new (not in the donor), proposed.
- 700 zones as data: the feel numbers go in one shared block per creature family, so the 100 Pit creatures reuse them. A zone may override the shake cap only.
- One character, one ledger: the knockback mass rule uses the creature's size, which already lives in the catalogue, so no second table.

Keep: max-merge shake with a cap; the damage-over-time flash gate; mass-scaled knockback; the per-bullet hit effect field; the random pitch on the click.
Change: shake falloff is measured in world units, so a camera zoom changes the feel. Fix: divide the distance by the camera zoom. Our flash should show on the creature's outline (a rim), not a full mix, to read at 375 wide.

Defects found (keep the idea, fix the defect):
- D1: presentation before damage (see Server-verified above). Fix: drive from the confirmed event.
- D2: falloff in world units, so zoom changes shake. Fix: divide by camera zoom.
- No defect found in the flash timing, the knockback impulse, or the shake decay in the code read.

Reuse: HF001 result.tsv (Ikemen GO) lists a shared hit-stop and shake order for the same topic. Not re-read here; cross-check before adding a second hit-stop.

## 5. Five-minute look test (Dom, on the phone)
Build one grey creature (flat fill, one-pixel rim) and three attackers that can hit it in the same tick. Show four variants at 375 wide, all with the same burst and click:
A. Donor order: burst, click, 9-tick white flash, max-merge shake.
B. Same, shake off.
C. Same, flash gated: the first hit in a window flashes; the other two do not re-flash.
D. Same, flash as a rim (outline) instead of a full white.
Dom judges: which hit landed when three hit at once, and whether the triple hit reads as one moment or as noise. Also compare a version with a two-frame hit-stop as a control (not donor-backed; no donor here has one).
Target: src/fight/hit-feedback.ts, row 10.

## 6. Licence and IP
GPL-3.0 code. Clean-room: the shape (order, gate, max-merge, mass rule) is kept, no donor code is copied, no donor numeric values are placed in the data fields. Assets have no licence statement and are not used: no donor sprite, sound or font. Recreate as a distinct original: keep the trait "one flash per gate window and a max-merge shake"; change the burst strokes, the palette and the click.

## 7. Gaps
- Not read: server/ module; android, desktop and ios launchers; the arc library (Mathf.clamp, Vec2.nor); the bodies of the Fx effects beyond the first lines; sound and sprite files; unit draw paths other than the mech path (UnitType 1957 to 1967).
- Half read: both (core logic and core client effects). The server module is the other half in the box and was not read.
- No hit-stop found in core. This is a negative grep result, not proof that no hit-stop exists anywhere in the donor.
- Death presentation: despawnShake fields exist on some blocks (Blocks.java, e.g. line 4692). Not read in depth. Idle and ambient animation: not in this topic, not read.
