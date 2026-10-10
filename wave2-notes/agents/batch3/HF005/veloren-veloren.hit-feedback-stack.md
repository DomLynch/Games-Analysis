# veloren-veloren: hit-feedback-stack (HF005)

Donor: /mnt/frankendom-donors/veloren-veloren (VPS, read only). Verdict: STRONG (idea), decision: adapt (idea).
Licence: code GPL-3.0 (LICENSE lines 1-2). Assets per entry in assets/credits.ron; the hit, poise, death, block and parry sound entries have no licence field in the lines read, and the file's own rule (credits.ron:22) assumes GPL3 when none is given. Clean-room only: no sound files, no code.
Depth: full for the hit order, the poise stagger ladder and knockback. Client sound and particle mapping read in full for the hit events.
Half read: both halves partly. Shared logic in common/ (combat.rs, poise.rs, character_behavior.rs, outcome.rs, stats.rs, energy.rs). Client in voxygen/src (audio/sfx/mod.rs, audio/mod.rs, event_mapper/combat/mod.rs, scene/particle.rs, hud/mod.rs). Data pack: assets/voxygen/audio/sfx.ron and assets/credits.ron. The server/ folder (where outcomes are forwarded) was not read beyond the grep hit list.
Checked: opened 14 candidate files: common/src/combat.rs, common/src/comp/poise.rs, common/src/comp/energy.rs, common/src/outcome.rs, common/systems/src/character_behavior.rs, common/systems/src/stats.rs, voxygen/src/audio/sfx/mod.rs, voxygen/src/audio/mod.rs, voxygen/src/audio/sfx/event_mapper/combat/mod.rs, voxygen/src/scene/particle.rs, voxygen/src/hud/mod.rs, assets/voxygen/audio/sfx.ron, assets/credits.ron, server/src/events/entity_manipulation.rs (grep hit only). Confidence high on the order and the numbers read. Medium on the server forwarding, which was not read. A repo-wide grep for hitstop, hit_stop, freeze and shake found no hit stop and no screen shake in the combat path.
Lands in: src/fight/hit-stagger.ts (proposed name, repo not checked), row 10 (hit impact and hitstop). The poise ladder replaces hit stop.

## 1. What the player sees and feels

- A hit does not freeze the world. The number that pops up over the target starts large and shrinks in its first tenth of a second, so each hit reads as a small punch on the numbers (hud/mod.rs:1693, 1766-1770).
- A solid hit on a weak target staggers it. Interrupted is a 0.4-second flinch with the target slowed to 80 percent. A stronger hit gives a 0.7-second stun at 50 percent speed. A heavy hit gives a 1.5-second daze at 20 percent speed, and enough poise loss puts the target on the ground for about 3 seconds (poise.rs:88-123, 141).
- Each stagger state plays from its own short list of sound files: Interrupted, Stunned, Dazed and KnockedDown each have their own list (sfx.ron:1748-1782).
- A block plays the Block sound. A parry plays the Parry sound with a burst of 10 spark particles lasting 200 ms (sfx.ron:1731-1747; particle.rs:434).
- A death puts a puff of 40 particles on the body for about 0.4 to 0.5 seconds with a death sound (particle.rs:547-549; sfx/mod.rs:916).
- There is no camera shake and no hit pause in the donor combat path. On a 375-wide phone the feedback is on the target and the numbers, not on the view.

## 2. Why it works / is striking

- Readable at 375 wide: the stagger is a change in the target's own pose and speed (the stunned state moves it at 50 percent speed). The eye reads a stunned target without a camera trick.
- One signature behaviour: a poise ladder. Each hit takes poise off; crossing a threshold picks a stagger state; the stagger resets poise to full and then gives a short immunity window, so one stagger cannot chain into another (poise.rs:173, 221-222, 254-256, 265-272).
- One signature sound: each stagger state has its own sound list, so a player can learn the state from the sound alone (sfx.ron:1748-1782). Whether that works in practice is for the look test to judge.
- Could be made ours at 20-30 percent resemblance: yes. Keep the ladder, the thresholds, the immunity window and the state-specific sounds. Replace the names, the animations and the sounds.

## 3. The rule behind it

Order of one melee hit on one target (common/src/combat.rs apply_attack and the next system pass):

1. Block or parry is checked first. A block emits a Block outcome for the client (combat.rs:231) and a poise change (combat.rs:236). A parry also emits a parry hook (combat.rs:213).
2. Health loss is emitted as a health change event if it is above the epsilon (combat.rs:452-456).
3. For slashing damage the attack drains energy as well. If the target's energy covers the drain, a poise change is emitted (combat.rs:532-536). If it does not, the uncovered part becomes extra health damage (combat.rs:462-531).
4. Knockback effects on the attack are then added as knockback events, scaled by the attack strength, skipped when the impulse is near zero (combat.rs:544-558).
5. On the next system pass (character_behavior.rs:173-194), the target's current poise is read and mapped to a state. If that state has a stun, the poise resets to full with an immunity window of the stun length plus 1 second, the character state becomes Stunned unless the target is already down, a PoiseChange outcome is emitted for the client, and if the state has an impulse, a knockback event is emitted with the impulse times the stored direction.

Poise state thresholds (current poise points; poise.rs:179, 265-272): above 50 is Normal; above 30 is Interrupted; above 15 is Stunned; above 5 is Dazed; at or below 5 is KnockedDown.

Stun data (poise.rs:88-123; duration = buildup + recover; movement speed):
- Interrupted: 0.2 + 0.2 s; speed 0.8; no impulse.
- Stunned: 0.35 + 0.35 s; speed 0.5; no impulse (the doc comment at poise.rs:68 says knocked back horizontally; the code gives no impulse for this state).
- Dazed: 0.75 + 0.75 s; speed 0.2; no impulse.
- KnockedDown: 1.5 + 1.5 s; speed 0; impulse 10.0.

Poise regen: a ramp. Regen rate grows by the regen acceleration each second, capped at 10 per second (stats.rs:16; poise.rs:240-252). It only runs while current poise is below maximum (poise.rs:241).

Knockback magnitude: 50.0 times strength, times the target's resistance factor (0.5 if resistant), times the attacker's knockback multiplier, with a direction set by the knockback kind (combat.rs:1880-1890). The 50.0 is marked TEMP in the source.

Data fields (designer-tunable; donor_value null because the donor is GPL-3):
- poise_thresholds: 50, 30, 15, 5 (poise points)
- stagger_duration per state: 0.4 s, 0.7 s, 1.5 s, 3.0 s (buildup plus recover)
- stagger_move_speed per state: 0.8, 0.5, 0.2, 0.0 (fraction)
- immunity_after_stagger: 1.0 s (added after the stun length)
- knockdown_impulse: 10.0 (units)
- knockback_scale: 50.0 (units per strength; marked TEMP)
- poise_regen_accel: 2.0 (per second squared); regen_rate_cap: 10 per second
- damage_sound_cooldown: 0.2 s
- floater_flash_window: 0.1 s; floater_flash_extra_size: 2 (font units)
- death_particles: 40; death_particle_life: 400 to 500 ms
- parry_spark_particles: 10; parry_spark_life: 200 ms

Counts from the data half:
- Hit and stagger sound entries in sfx.ron: 8 trigger keys, 24 files. Damage 4 files; Death 3; Block 3; Parry 2; Interrupted 4; Stunned 3; Dazed 3; KnockedDown 2 (sfx.ron:1712-1790).
- Poise states: 5 (Normal, Interrupted, Stunned, Dazed, KnockedDown).

## 4. For Frankendom

- Shape: a server-verified hit runs one ordered list of steps: block, health, poise, knockback, then the stagger state, then the client outcome. The engine owns the state; the client only maps the outcomes to sound, particles and the floating number. That matches our rule that the sim is one engine and the sound, camera and HUD are client-only.
- Hit stop: the donor has none, so the poise ladder does its job. Our row 10 wants a hit impact, and the stagger is the server state that gives it. Do not add a sim pause.
- 700 zones as data: the thresholds, the stagger durations and the sound lists are data. A creature family can share the ladder and differ only in its thresholds.
- 100 Pit creatures reused across zones: the stagger states are shared; each creature family gives its own sound list and move speed.
- Many-vs-one (max 3 attackers): the immunity window is the key rule. Three attackers hitting in the same window do not chain three stuns; after the stun and one second, the next hit counts again. Keep it.
- Death: the death puff and sound are the death presentation; use the same mapping for our death.
- What to keep: the ladder, the thresholds, the immunity window, the per-state sounds, the rule that the health loss and the poise loss are separate events.
- What to change: (a) the Stunned doc and code disagree (defect below), (b) sound cooldown is not applied on the outcome path (defect below), (c) poise regen has no reset path (defect below).

Defects found, with fixes (keep the idea, fix the defect):

- Stunned has no push but its doc says it is pushed. poise.rs:68 says "knocked back horizontally"; poise.rs:97-105 gives no impulse for Stunned. Fix: pick one. Keep the idea of a small sideways push on Stunned and set a data field stagger_push for it, or fix the doc.
- The sound cooldown does not run on the client outcome path. The per-entity cooldown lives in event_mapper/combat/mod.rs:118-133 (should_emit, compared at line 127). The outcome handler calls emit_sfx directly for HealthChange, Death, Block, Parry and PoiseChange (sfx/mod.rs:907-929). On that path, each HealthChange outcome as read starts its own sound, so a multi-hit attack could start the same sound several times in a row (server forwarding not read, so this is a read of the client path only). Fix: keep a cooldown per entity and per sound on the outcome path, reading damage_sound_cooldown.
- The sound threshold is used as a subtitle time. emit_sfx passes the entry's threshold to the subtitle as its duration (audio/mod.rs:640 and the emit_subtitle call at 664). The same field is the cooldown in the state mapper. Fix: split it into two fields: subtitle_seconds and cooldown_seconds.
- Poise regen rate is never reset. poise.rs:250 raises regen_rate each regen tick up to 10 and nothing in poise.rs sets it back. energy.rs:111 has a reset function for energy; poise has none. So a hit after a long regen starts regen fast. Also regen() raises the rate even when change() ignores the regen during the immunity window (poise.rs:241-250 and 220-222). Fix: reset the rate when a hit lands, and do not raise it while the change is ignored.

## 5. Five-minute look test (Dom, on the phone at 375 wide)

Three fights against the same three enemies at once, each with the same hit pattern:
- A: health numbers only (no stagger, no sound change).
- B: the ladder with Interrupted and Stunned only (0.4 s and 0.7 s), with a sound per state.
- C: the full ladder including Dazed and KnockedDown (3 s down).
Compare: can you tell which enemy is staggered when all three are close? Does the stagger read at 375 wide without a camera move? Is the immunity window enough to stop three hits chaining into a stun loop?

## 6. Licence and IP

- Code: GPL-3.0. Clean-room. We adapt the ladder shape and the immunity idea. No code copied.
- Assets: the hit, poise, death, block and parry sounds sit in author blocks with no licence field in the lines read; the donor's own rule assumes GPL3 (credits.ron:22). We do not use the files. We record our own or a licence we hold.
- Category-level inspiration only: "a staggered target that slows and recovers", "a short flinch sound per stagger state", "a burst of sparks on a parry". No file names, no sound content, no particle code.
- Recreate as an original: keep the state ladder and the immunity window; change the thresholds, the names, the sounds and the particle art.
- No legal conclusions.

## 7. Gaps

- Not read: server/src forwarding of outcomes (only the grep hit list), the Stunned character-state animation (voxygen/anim and common/src/states/stunned.rs), the block event mapper (voxygen/src/audio/sfx/event_mapper/block.rs), scene/particle.rs flash gate details (flashing_lights_enabled at particle.rs:2667-2788 gates several effects; only the gate lines were seen), the Damage and Death voice sets beyond the file names.
- Half read: client and common for the hit events; server not read.
- Accessibility: voxygen/src/scene/mod.rs:160 has a flashing-lights setting, and the gate is used in particle.rs for several effects. Not read in full. Note it for the look test: a flashing-lights switch must cover our blink too.
- Death and respawn: only the death puff and sound were read. Respawn presentation not read.
- Walk density, idle animation, loot reveal: not in scope of this topic.
- Readability at 375 wide: not measured; the look test above is the check.
