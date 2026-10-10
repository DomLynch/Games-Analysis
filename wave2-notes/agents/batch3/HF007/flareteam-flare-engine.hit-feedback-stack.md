# flareteam-flare-engine (hit-feedback-stack, feel note HF007)

Donor: `/mnt/frankendom-donors/flareteam-flare-engine` (engine half, VPS, read-only) with paired data pack `/mnt/frankendom-donors/flareteam-flare-game` | Licence: code GNU GPL v3 (README.engine.md:33, per AU020); default-mod art and text stated as GPL v3 and CC-BY-SA 3.0 (README.engine.md:35). Shape only, clean-room. No code, art, sound file or donor number is reused.

Checked: verdict STRONG on the hit-impact ordering and the crit/knockback/cooldown gates. Read in full: `src/Entity.cpp` takeHit (319 to 710), `src/Camera.cpp` logic (around 100 to 122), `src/EffectManager.cpp` clearStatus and logic (355, 390 to 480, 555 to 560), `src/StatBlock.cpp` cooldown and knockback apply (255 to 258, 1282 to 1288), `src/CombatText.cpp` logic (164 to 200), `src/EntityBehavior.cpp` ENTITY_HIT (898 to 910). Confidence high on order and gates. Medium on the Timer unit (Timer class not located in src; read as frames from its use). Half read: both. The engine is the mechanism; the data pack holds the values, read by count and by a few lines. Receipts: `receipts.tsv` (26 flare rows; the file verifies 54 of 54 with the gate script).

Best transferable idea: a crit both jolts the world and locks out a second push, so a three-on-one fight reads as one clear hit at a time.

## 1. What the player sees and feels (375 wide)

A hit on an enemy throws up one short number over the target. It rises and fades in about a second, and if it would land on an older number, the older one is nudged up so they do not sit on top of each other. A normal hit plays a hit sound, unless that creature is still inside its hit cooldown, and the creature flinches into a short hit animation that holds to the last frame before it returns to standing. A poised creature may shrug a normal hit off. A critical hit always flinches, is drawn in the crit colour, jolts the whole map view for about half a second (a small random offset each frame), and rumbles a gamepad if one is attached. The jolt happens only when the target is an enemy, so a crit landed on the player does not shake the screen. Some powers push the target away from the caster for a fixed time; the push runs through the collision grid, stops at walls, and the target cannot walk while it lasts. There is no hit-stop (freeze frame) and no screen flash in the code I read (grep of `src/` for shake, freeze, pause, flash, hitstop returned only the shake, rumble and the unrelated flash noted in Avatar.cpp).

## 2. Why it works, is it striking

- Readable at 375 wide: one number per hit, colour set by type (crit, normal, taken, given, miss). Labels are kept from overlapping (CombatText.cpp 179 to 190). That last rule is what keeps a three-attacker fight legible.
- One signature behaviour: the crit jolt, and only when the target is an enemy. A player crit feels heavy; a crit on the player does not turn the camera.
- One signature sound: the hit sound is gated by a per-creature cooldown (Entity.cpp 661 to 662). A flurry from three attackers gives one sound per window, not three.
- Could be made ours at 20 to 30 percent resemblance: yes. The crit-only jolt with a short random offset, the floating number that pushes older labels up, and the cooldown-gated hit sound all map directly.

## 3. The rule behind it (order and gates, as the code runs)

Order inside one `takeHit` call (Entity.cpp):
1. Filters first: category and power filters, dead check, movement-type miss (319 onward).
2. Absorb and block reduce the damage (around 457).
3. Crit roll (475 to 487). If it hits, damage is multiplied by a random factor between a min and max crit (EngineSettings.cpp 358 to 363 default, data-tunable). If the target is not the hero: camera jolt timer set and rumble (491 to 493). The jolt is set here, before HP changes.
4. Overhit and miss multipliers (496 to 504).
5. Floating text added (512 to 521). The text is added before stats.takeDamage (532), so the number is on screen the frame the hit lands.
6. Damage applied (532).
7. After effects: powers on hit, HP and MP steal, return damage, chain powers (535 to 615).
8. If damage is above zero: remove stun; hit sound if the hit cooldown has ended (661 to 662); poise roll (683 to 692; crit bypasses poise at 698); if the hit cooldown has ended, restart it and set the hit state (695 to 708), unless stunned, poised, or interrupt-proof.

Knockback (power post-effect "force" in the data):
- Each frame the effect pass recomputes status from active effects (EffectManager.cpp 390 to 391). A knockback effect sets a per-frame speed = magnitude divided by the frame cap (EffectManager.cpp 472).
- Only one knockback effect is active at a time; a second one is dropped while the first runs (EffectManager.cpp 558 to 559).
- The push direction is source to target. Each frame the target moves through the collision grid (StatBlock.cpp 1282 to 1288) and cannot walk on its own while the push runs (Entity.cpp 293).

Camera jolt:
- Camera timer ticks each frame (Camera.cpp 113). While it runs, the shake offset is random per axis within a fixed strength (shake_strength default 8 at Camera.cpp 42) times a fixed 1/128 tile (Camera.cpp 120 to 121). The map layers use the shaken position (MapRenderer.cpp, many lines); whether the HUD is shaken was not checked.
- Two sources set the timer: a crit on an enemy (Entity.cpp 492, half the frame cap) and map events "shakycam" (21 event lines in the data pack, durations from 500 ms to 2 s).

Data fields (designer-tunable; donor values not recorded, GPL):
- `crit_mult_min`, `crit_mult_max`: unit percent of base damage.
- `crit_jolt_ms`: unit ms. Value set at the look test.
- `jolt_amp_tiles`: unit tiles. Value set at the look test.
- `crit_rumble_ms`: unit ms.
- `hit_cooldown_ms`: unit ms, per creature. The data pack sets it on only 2 creatures, so it is an opt-in field, not a global.
- `poise_pct`: unit percent chance (the engine has three poise styles: chance, hp-ratio, absorb-ratio).
- `knockback_speed_tiles_s`: unit tiles per second.
- `knockback_ms`: unit ms (the power's post-effect duration).
- `text_life_ms`, `text_fade_ms`, `text_rise_per_s`: unit ms and tiles per second (maps to the combat text duration, fade and speed keys).
- `corpse_timeout_s`: unit s.

## 4. For Frankendom

Lands in: TARGET `src/fight/hit-impact.ts` (new): the engine emits one ordered HitEvent per hit (damage, crit flag, kill flag, blocked flag, knockback vector and duration, cooldown flags). Parity row 10 (hit impact and hitstop) is the one row. The client does the presentation (camera jolt, floating numbers, hit sound, hit animation), because camera, HUD and sound are client-only (row 11 fight camera, row 12 combat sound cues, both client).

Mapping to our shape:
- 700 zones as data: the jolt, cooldown and knockback numbers are zone-level data fields with defaults, not constants in the function.
- 100 Pit characters reused across zones: the same hit cooldown and knockback fields serve every creature; a creature sets its own values in data.
- Many-vs-one (max 3 attackers): the flare cooldown gate and the one-knockback rule carry straight over. Three attackers in one tick should give one jolt per tick, one hit sound per cooldown window, and one push per target per window (the first accepted push locks the rest), with the floating numbers stacked as today.
- Server-verified: the push is a state change in the engine (position), so the server decides it. The client only tweens to it. Do not let the client decide a push.
- Server tick: any hit-stop or freeze is client presentation only; the server tick keeps stepping (fixed step, input intake, per-tick NPC budget; row 18 and post-K item 3).

Keep: text before HP change (the number is on screen the frame the hit lands); crit bypasses poise; crit-only jolt on enemies; cooldown-gated hit sound and hit state; the floating-label push-up rule; one knockback at a time.

Change: the donor's jolt uses unseeded rand() each frame. That is fine for the client (it does not affect replay), but move it to a seeded client RNG so screenshots and the fight record (row 19) do not drift. Drop the donor's power-effect plumbing for knockback; express knockback as one engine field with a lock.

## 5. Five-minute look test (Dom on his phone)

Build one 10-second clip: three attackers hit one target in turn, drawn at the fight camera, 375 wide. Compare three versions on the same clip, one per tap:
- A: one jolt per tick (crit only, enemy targets only), one hit sound per cooldown, floating numbers pushed up, one push per window.
- B: no jolt at all (control).
- C: a jolt and a push on every hit (what not to do).
Dom judges which one reads as one clear hit at a time on the phone. Publish through the look-test `/preview/` flag; no release rows, no lock.

## 6. Licence and IP

Code is GPL v3: clean-room, shape only; the Entity, Camera and EffectManager code is not translated. Default-mod art and text are stated as GPL v3 and CC-BY-SA 3.0 (README.engine.md:35, no per-file split), so no art or text is reused. The sound files named in the data pack (`sfx_hit`, 20 lines, ogg) are not copied and no donor sound is reused. Inspiration stays category-level: a crit-only jolt, a cooldown-gated hit sound, one push at a time.

## 7. Gaps

- Not read: the Timer class (unit inferred from use); the animation loader and per-animation hit durations; the sound definitions beyond the `sfx_hit` key; whether the HUD is shaken; `EntityBehavior` death handling beyond a short read at 898 to 915 (die animation and the SOUND_DIE on first frame are seen there; the rest not read); the enemy list beyond counts (142 enemy files in the data pack, counted, not read).
- Not in this topic and not read: idle and ambient behaviour, loot reveal ceremony, walk density, boss staging.
- Half read: both halves, but the data pack was read by count and by a few lines (values for hit cooldown, post-effects, shakycam, combat text), not as a full table.
- Donor numbers are not reproduced in the data fields (GPL); the values are to be set at the look test.
