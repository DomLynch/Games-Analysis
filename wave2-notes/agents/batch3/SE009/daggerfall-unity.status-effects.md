# daggerfall-unity (status-effects, SE009)

Donor: `/mnt/frankendom-donors/daggerfall-unity` (read-only, VPS) | Licence: MIT for the code. Root LICENSE line 1 is "MIT License" and line 3 gives "Copyright (c) 2009-2023 Daggerfall Workshop". `Assets/Licenses/Daggerfall Unity.txt` line 3 names Gavin Clayton, 2014-2022, also MIT. The two holder lines differ and both are recorded as the files state them. Code may be adapted with the MIT notice kept. The game-like text and tables under `Assets/StreamingAssets` are class C (per AU013) and are not used here.

Checked: Read the magic-effect base (start, duration, chance, rounds), the incumbent pattern and its four subclasses that matter here (paralysis, silence, fortify, drain), the poison and disease effects at the rule level, the effect-bundle assignment order (chance and saving throw), the magic-round clock with catch-up, and the knockback path in the enemy attack, the weapon hit and the enemy motor, with the classic-tick and unit constants. Confidence: high on order of operations and the knockback arithmetic (the formula was re-derived by hand and checked on two sample inputs); high on the paralysis stacking defect as read (not reproduced in a running game). Not read in depth: the disease effect body (315 lines, rule-level only), enemy weight function, and the render path. Half read: client (code). The DOS data-pack half (MAGIC.DEF, spell and effect records) is not in the box. Data table read at the header only: `Assets/StreamingAssets/Tables/Spells-Entity.txt` (65 lines, schema `*name,p1,p2`, where p1 is 0 stats, 1 skills, 2 vitals). Names not copied.

## 1. What the player sees and feels

A knocked enemy slides back from the blow. A heavy hit on a light creature throws it a long way and the creature goes into its hurt pose for the length of the slide; a heavy creature barely moves. The slide ends with a short stop and the creature returns to its normal move. Paralysis, silence and fortify have no pose of their own: the player reads them from the controls (a paralysed hero does not move, a silenced hero cannot cast) and from the HUD text line that the effect prints once when it lands. Poison and disease start after a delay and then tick once a game minute, so the player gets a quiet window between the bite and the first damage. On a 375-wide phone the slide is the readable part: a clear arc with a clear stop, at a size that does not hide the next enemy.

## 2. Why it works / is striking

- Readable silhouette or beat: the slide has a start (the blow), a travel and a stop (the hurt pose ends). The stop is the beat.
- One signature behaviour: knockback scales with damage squared over a weight term, so a dagger and a warhammer push the same creature by very different amounts. The formula is one line.
- One signature sound or effect: the hit sound and the blood splash fire on the same blow (EnemyAttack.cs around line 322-333). No sound was read beyond that.
- Could be made ours at 20-30 percent resemblance: yes. Keep the squared-damage push, the weight divisor and the no-re-push-while-sliding gate. Change the numbers, the stop pose and the splash.

Verdict: STRONG. Real arithmetic, read in full, self-contained, re-expressible as one server-computed push event.

## 3. The rule behind it

Knockback (read in `Assets/Scripts/Game/EnemyAttack.cs` lines 335-350 and `Assets/Scripts/Game/WeaponManager.cs` lines 575-593; same formula in both):
1. Gate: only when the target's motor is not already sliding faster than the threshold (5 classic units), and the target is an enemy-class creature or has a positive weight.
2. Let D be the damage and W the weight in classic units. Let T be 10 times D. The code computes a raw speed from T, W and 2 times D.
3. The code carries a factor of 256 in and out (`(... * 256) / (...) * 2D` then `/256`). Those cancel in floating point, so the arithmetic is algebraically: speed (classic) = 40 times D squared, divided by (W + 10 times D). Check: D=10, W=100 gives 20; D=30, W=100 gives 90.
4. Convert to the unity unit by dividing by (39.5 / 10), then clamp up to a minimum (15 classic units).
5. The enemy motor (`Assets/Scripts/Game/EnemyMotor.cs` lines 265-320) then: caps the stored speed at 40 classic units (line 276); enters the hurt pose while the speed is above 5 (lines 281-282) unless the enemy is mid-attack; moves at the stored speed up to a motion cap of 25 classic units (line 290); decays the stored speed by 5 classic units on each classic tick (line 303); re-evaluates its tactic while the speed is above 10 (line 312); and blocks its own actions while sliding (CanAct false).
6. The classic tick is 0.0625 s (GameManager.cs line 42), so one decay step is 1/16 s.

Worked number (our own check, not game data): a 10-damage hit on a 100-weight creature gives 20 classic units, which is above the 15 minimum and so stands. Hits of 30 damage on the same creature give 90, which the 40 cap cuts to 40 for the stored speed and the 25 cap limits the motion.

Poison (read in `Assets/Scripts/Game/MagicAndEffects/Effects/Poisons/PoisonEffect.cs` lines 115-200): a poison is a small state machine. A start delay in game minutes is drawn from a per-type range (lines 143), then a duration in game minutes from another range (line 144). It ticks once per game minute while the state is running. There are 12 poison types. A poison does not stack with itself (AddState does nothing, line 152).

Disease: a host cannot catch the same disease twice in this port (`DiseaseEffect.cs` lines 106-111). Classic allowed it. Read at rule level only.

Incumbent pattern (read in `Assets/Scripts/Game/MagicAndEffects/IncumbentEffect.cs`): the first instance of a like-kind effect on a host becomes the flagged incumbent (line 55). A later instance does not get its own ticking copy: it adds its state to the incumbent (line 63). Unflagged instances never tick.

Per-kind stacking (read in the four subclasses):
- Paralysis and silence: the later instance adds its rounds to the incumbent (Paralyze.cs line 77; Silence.cs line 77). The duration grows; no cap was seen.
- Fortify: the incumbent sets one stat magnitude when it becomes incumbent (FortifyEffect.cs line 33). Later casts add rounds only. A stronger recast does NOT raise the magnitude.
- Drain: each later cast adds its magnitude to the incumbent (DrainEffect.cs lines 80-83). The drain holds at least one forced round until healed.

Magic round clock (read in `EntityEffectBroker.cs` lines 205-236 and `EntityEffectManager.cs` lines 1733-1736):
- One magic round is one in-game minute (broker comment line 209). Catch-up is capped at 2 days, which is 2880 rounds (line 36). A long rest or fast travel fires at most that many rounds, then the clock jumps.
- Each effect's rounds are set on start: base plus plus-per-level times the caster level multiplier, with the multiplier floored at 1 (EntityEffect.cs lines 926-929). Default settings are base 1, plus 1, per-level 1 (EntityEffect.cs lines 951-953).
- An effect with rounds above zero gets a round each tick; at zero it ends on the next tick (EntityEffectManager.cs lines 1733-1736). So N rounds means N active ticks and one end tick.

Assignment order (read in `EntityEffectManager.cs`, `AssignBundle`): the effect is started first (line 530, which sets its duration and chance and, for incumbents, adds rounds to the incumbent). Only then is the chance roll checked (lines 535-537) and the saving throw (lines 571-575) applied. Silence blocks casting when the host is silenced (lines 314-315 and 403-404). God mode exempts the player from paralysis (line 583).

## 4. For Frankendom

- One engine: the knockback push, the paralysis and the poison tick belong in `src/fight`. The client plays the slide, the hurt pose and the delay tell. Parity row 10 (hit impact) carries the slide; row 3 (guard, parry, stamina) carries any block change; row 18 (XP and loot) does not apply here.
- Server ticks: the donor's unit is a game minute. Our unit is one server tick. Keep the rule "rounds add to the incumbent" and express the round as a server tick count.
- Server-verified: the donor uses Unity's `Random.Range` for poison timing, so the timing is not server seeded. For us the start delay and duration must come from the server seed and be written to the fight record (row 19).
- 700 zones as data: the push factor, the weight per creature and the poison ranges are zone or creature data. The formula stays in the engine.
- Many-vs-one (max 3 attackers): the no-re-push-while-sliding gate is the protection that stops three attackers from chain-launching one enemy. Keep it, and fix the precedence defect below before relying on it.
- 100 Pit characters reused across zones: one incumbent per (host, kind). Keep that key; a recoloured character reuses the same status logic.
- Keep the poison delay as a telegraph: a readable quiet window before the first tick. It reads well on a phone.

## 5. A 5-minute look test (Dom, on the phone)

Build a Pit dummy with two sizes (light and heavy) and three buttons.
- Heavy hit on the light dummy: expect a long slide with a clear stop.
- Heavy hit on the heavy dummy: expect a short nudge.
- Two hits in quick succession on the heavy dummy (weighted, not an enemy-class creature): expect the second hit NOT to restart the slide. Today it does (defect, see below), so this is the check that proves the fix.
- Cast paralysis three times on a dummy: expect the remaining duration to grow each time.
- Cast paralysis with a forced 50 percent chance and fail it: expect the remaining duration NOT to grow. Today it does (defect, see below).
Compare on a 375-wide screen.

## 6. Licence and IP

MIT code. Adapt allowed with the MIT notice kept. The two copyright lines differ (see Licence line) and are recorded as the files state them. The formula and the poison state machine are code. The poison ranges and the spell table are game-like data (class C); the names in the spell table are not copied. Recreate as a clearly distinct original: keep the squared-damage push and the weight divisor; change the constants, names and poses. No legal conclusions.

## 7. Gaps

- Not read: the DOS data-pack half (MAGIC.DEF, effect and spell records, poison and disease tables as data). Not in the box.
- Not read in depth: `DiseaseEffect.cs` (315 lines, rule-level only), the enemy weight function (`FormulaHelper.GetEnemyEntityWeightInClassicUnits`), the render path for slides and splashes, the sound for the hit.
- Not read: `Spells-Entity.txt` body (header and line count only).
- Keyword grep over `Assets/Scripts` for fear, frenzy, demoralise, stagger, stun and flee: no status of those kinds. The knockback push is the closest analogue; a fear or stagger status would have to be designed, not ported.
- Not read: whether a hit that lands on a sliding enemy from a different attacker in a multi-enemy fight can override the stored direction in other paths.
- Where the donor has the other presentation items: idle and ambient behaviour, death and respawn presentation, loot reveal, walk density and readability at 375 wide are outside the status code and were not read.
- Half read: client (code). Server half: not applicable (single-player client).

## Defects (keep the idea, fix the defect)

1. Paralysis and silence add rounds before the chance and saving-throw checks. Read at `EntityEffectManager.cs` line 530 (start, which adds rounds to the incumbent via `IncumbentEffect.cs` line 63) and then lines 535-537 (chance, `continue` on fail) and 571-575 (save, `continue` on save). So a cast that fails its chance or is saved against still extends an active paralysis or silence. Idea kept: a like-kind incumbent that adds rounds. Fix: run the chance and save checks before start, or let `AddState` commit only after both pass. Decision: adapt (idea) with this fixed.
2. Knockback re-push on weighted targets. `WeaponManager.cs` lines 578-580 read `A && B || C`, where C is `Weight > 0`. Because of the precedence, a weighted non-enemy-class target is re-pushed even while it is still sliding, which resets the stored speed and direction. The matching check in `EnemyAttack.cs` lines 336-337 parenthesises correctly and is not affected. Idea kept: no re-push while sliding. Fix: parenthesise as `EnemyAttack.cs` does, and pull both paths into one function.
3. The same knockback formula exists twice (`EnemyAttack.cs` 343-350 and `WeaponManager.cs` 586-593) and already differs (point 2). Fix: one function in `src/fight`.
4. The factor 256 cancels in the float code (`knockBackAmount / 256` after `* 256`). Not a defect in floats, but a legacy fixed-point scale that would break an integer port. Fix: use the simplified 40 D squared over (W + 10 D) form and keep a test with the two sample points.
5. Division by a zero weight. The enemy-class branch has no guard for zero weight (the weight function was not read). Zero weight gives an infinite speed before the clamp at `EnemyMotor.cs` line 276, which then caps it. Harmless in practice but ugly. Fix: clamp weight to at least 1 before dividing.

## Best transferable ideas (one line each)

- Knockback: a push that scales with damage squared over (weight + 10 times damage), with a minimum, a store cap, a motion cap and a decay per tick.
- No re-push while sliding: the gate that stops a crowd from chain-launching one enemy.
- Incumbent: one live status per (host, kind); later applications add rounds or magnitude to it.
- Clock: one round per game minute with a catch-up cap; a poison's quiet start delay is a readable telegraph.
- Fortify keeps one magnitude and adds only rounds: a recast is a refresh, never a bigger buff. Keep this only if the design wants refresh-only buffs; otherwise change it.
