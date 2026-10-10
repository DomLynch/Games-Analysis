# daggerfall-unity (hit-feedback-stack, HF010)

Donor: `/mnt/frankendom-donors/daggerfall-unity` (client half, Unity C#, read-only on VPS) | Licence: MIT. Root LICENSE line 1 ("MIT License") and line 3 ("Copyright (c) 2009-2023 Daggerfall Workshop"). Assets/Licenses/Daggerfall Unity.txt line 3 names a different holder and range ("Copyright (c) 2014-2022 Gavin Clayton"); both are MIT, the conflict is recorded as is. Game data is not in the box.

Checked: read in full the hit path in `Assets/Scripts/Game/WeaponManager.cs` (381-437, 540-630), `EnemySounds.cs` (116-130), `EnemyAttack.cs` (245-300, 303-388), `EnemyMotor.cs` (263-320, 1383-1410), `ShowPlayerDamage.cs` (18-56), `PlayerHealth.cs` (36-42), `EnemyBlood.cs` (26-38), `EnemyDeath.cs` (40-170, the completion path), `FPSWeapon.cs` (265-290, 549-556), `FormulaHelper.cs` (538, 682, 766, 2881-2899), `EnemyEntity.cs` (496-498). Searched all of `Assets/Scripts` (External/iTween excluded) for shake, hitstop, timeScale, flash, knockback. Confidence: high for the combat path as read; medium on the audio content (not in box).

## 1. What the player sees and feels

A melee swing lands on one animation frame. On a hit, one of five weapon hit clips plays at random (the clip content is not in the box), a one-shot blood billboard pops at the impact point and runs at 10 frames per second, and the enemy is shoved backwards in the hit direction. The push lasts a few classic ticks and the body switches to its hurt pose while it is above the hurt threshold; a heavier hit pushes further. The player's own feedback is only a full-screen red wash that starts at 0.4 alpha and fades at 0.7 per second (about 0.6 s). A miss plays the swing or a parry sound and nothing else. There is no freeze and no camera jolt.

## 2. Why it works or is striking

- Readable at 375 wide: the blood billboard and the knock are the two things a thumb can see; there is no shake to blur the screen.
- One signature behaviour: the knock depends on damage and on the victim's weight, so a dagger and a warhammer push different enemies differently.
- One signature sound: five clip variants for a weapon hit, two for an unarmed hit (`EnemySounds.cs` 123, 127).
- Could be made ours at 20-30 percent resemblance: keep the weight-scaled knock and the random clip pick; change the blood to our palette and add a hit-stop the donor does not have.

Not present (checked): no hit-stop (the only `Time.timeScale` write is the pause path, `GameManager.cs` 607), no screen shake (no `ShakePosition` or similar call outside the bundled iTween library), no enemy colour flash (no colour or tint writes in the enemy files searched).

## 3. The rule behind it

Order of operations at one swing (`WeaponManager.WeaponDamage`, called from the melee hit path):

1. Hit-frame gate: fires once when the current frame equals the weapon's hit frame (`WeaponManager.cs` 381), then sets the one-shot flag (437). Melee hit frame is 2 and bow hit frame is 5 (`FPSWeapon.cs` 272-277).
2. Damage from `FormulaHelper.CalculateAttackDamage` (547). The swing time (`FPSWeapon.cs` 287, `animTicks * animTickTime`) is passed in and feeds the hit-chance and damage adjusters (`FormulaHelper.cs` 682, 766).
3. If damage is above zero, in the same frame and in this order: hit sound (565), blood splash (572), knockback set (578-593), combat voice on a 40 percent roll (597). Attack voice is a separate 20 percent roll on the hit frame (388).
4. Health is removed after the feedback block (627), then the attacker-side hook runs (630).
5. The next Update: if the enemy's death flag is set (`EnemyDeath.cs` 167), `CompleteDeath` makes the lootable corpse, plays the body-fall clip at the loot position (128), lowers the alert state, and raises the death event. No freeze, no fade found in that path.

Knockback (same numbers in `WeaponManager.cs` 586-591 and `EnemyAttack.cs` 339-348):

- Donor two-step form: `knockBackAmount = ((10d - W) * 256) / (W + 10d) * 2d`, then `speed = (10d / W) * (2d - knockBackAmount / 256)`, where d is damage and W is enemy weight in classic units.
- Algebra: the two steps reduce to `speed = 40 * d^2 / (W + 10 * d)`. Checked numerically: d=10, W=50 gives 26.6667 both ways; d=20, W=100 gives 53.3333 both ways; d=7, W=333 gives 4.8635 both ways.
- Weight `W` is `int(carried items * 4) + base`, where base is the monster's own weight, 240 for a female human, 350 otherwise (`FormulaHelper.cs` 2887-2897).
- Clamp: minimum 15 classic units (`WeaponManager.cs` 590); maximum 40 classic units while moving (`EnemyMotor.cs` 276).
- Decay: 5 classic units per classic update (`EnemyMotor.cs` 301-303). Above 5 the enemy enters the hurt state (282). Above 10 it re-evaluates its attack (inside `KnockbackMovement`, 263-320).
- Gate to set a new knock: the donor only overwrites a live knock when the current speed is at or below 5 (578).

Resulting knock after the clamps (classic units), from the closed form above:

| weight W | damage 4 | damage 8 | damage 12 | damage 20 |
|---|---|---|---|---|
| 100 | 15 | 15 | 26.2 | 40 |
| 240 | 15 | 15 | 16.0 | 36.4 |
| 350 | 15 | 15 | 15 | 29.1 |

The 15 floor means damage 4 and damage 8 push the same distance against every weight in the table. That is a tuning fact to test, not a defect.

Data fields (donor values are MIT code, so they may be listed):

| name | unit | donor_value_or_null |
|---|---|---|
| hit_frame_melee | animation frame | 2 |
| hit_frame_bow | animation frame | 5 |
| hit_sound_variants_weapon | count | 5 |
| hit_sound_variants_unarmed | count | 2 |
| combat_voice_chance_on_hit | percent | 40 |
| attack_voice_chance_on_hit_frame | percent | 20 |
| blood_splash_fps | frames per second | 10 |
| knock_speed_min | classic units | 15 |
| knock_speed_max_moving | classic units | 40 |
| knock_decay_per_classic_update | classic units | 5 |
| knock_hurt_above | classic units | 5 |
| knock_reeval_above | classic units | 10 |
| weight_base_female | classic units | 240 |
| weight_base_other | classic units | 350 |
| weight_per_carried_item_unit | multiplier | 4 |
| flash_start_alpha | 0 to 1 | 0.4 |
| flash_fade_per_second | 1 per second | 0.7 |
| fall_damage_per_metre | hit points per metre | 5 |
| hit_stop_ms (ours, not donor) | milliseconds | null |
| shake_px (ours, not donor) | pixels | null |
| shake_ms (ours, not donor) | milliseconds | null |

Sketch (typechecked on the VPS with `tsc --strict --target es2020`, exit 0):

simplified: the donor order is kept for hit and miss; the knock uses the donor's closed form with the donor's min and max; hit-stop, shake and flash numbers are ours and not from the donor; the sketch omits the direction vector, the attack-voice roll, the Strikes enchant payload and the arrow inventory step.

```ts
export {};

export const KNOCK_MIN = 15;
export const KNOCK_MAX = 40;
export const KNOCK_DECAY_PER_TICK = 5;
export const KNOCK_HURT_ABOVE = 5;

export function knockbackSpeed(damage: number, weight: number): number {
  if (damage <= 0) return 0;
  const w = Math.max(1, weight);
  const raw = (40 * damage * damage) / (w + 10 * damage);
  return Math.min(KNOCK_MAX, Math.max(KNOCK_MIN, raw));
}

export function stepKnockback(speed: number): number {
  return Math.max(0, speed - KNOCK_DECAY_PER_TICK);
}

export type FeedbackStep =
  | 'miss-sound' | 'hit-sound' | 'blood' | 'knockback-set'
  | 'voice-roll-40' | 'health' | 'aggro';

export function hitOrder(damage: number): FeedbackStep[] {
  if (damage <= 0) return ['miss-sound'];
  return ['hit-sound', 'blood', 'knockback-set', 'voice-roll-40', 'health', 'aggro'];
}

export const PRESENT = { hitStopMs: 70, shakePx: 3, shakeMs: 120, flashAlpha: 0.35, flashMs: 180 } as const;

export function knockTicks(speed: number): number {
  let s = speed;
  let ticks = 0;
  while (s > 0) {
    s = stepKnockback(s);
    ticks++;
  }
  return ticks;
}
```

## 4. For Frankendom

- Target file: `src/fight/hit-feedback.ts`. Parity row 10 (hit impact/hitstop). The blood, flash, sound and death lines are the same event shown on rows 8, 11, 12 and 17.
- Server and client split: the damage, the knock displacement, the health and the death are server state; the sound, blood, flash, shake and hit-stop are client presentation driven by one server-verified hit event carrying the hit frame, damage, target weight and post-hit health. The donor queues feedback before health removal; in our build the client reads post-hit health from the event, so death presentation does not need the donor's one-update deferral.
- Zones and 700 zones as data: none of this is per zone. Put weight, blood index and knock data on the 100 Pit character rows and reuse them across zones.
- Many-on-one (max 3 attackers): the donor's guard stops a live knock from being replaced. Keep that for three attackers, so a target knocked by one attacker is not re-launched by the other two during the push, while damage still lands.
- Keep: closed-form knock from damage and weight, min and max clamp, the order sound, blood, knock, health; the 40 percent combat voice roll; the one-shot hit-frame gate.
- Change: add player-side feedback (the donor only has the red flash on the player); fix the guard precedence (defect below); use our units and our server tick, not the classic-update gate; hit-stop, shake and flash are ours.

Defects (keep the idea, fix the defect):

1. Guard precedence. `WeaponManager.cs` 578-580 reads `A && B || C` with no grouping, so monsters with weight above zero bypass the live-knock check. The enemy-on-enemy path at `EnemyAttack.cs` 336-337 groups the same guard. Fix: group as in 336 (`A && (B || C)`) and confirm the intent with the donor's author if needed. Decision: adapt (idea), defect fixed in the sketch's guard.
2. Two-step knock arithmetic (`WeaponManager.cs` 586-588). Same value as the closed form, but it divides and multiplies through the weight. Fix: use the one-line closed form (sketch above).
3. Legacy `EnemyHealth.cs` 43 tests `if (Health < 0)`, so a monster at exactly zero survives one more hit. No caller of `EnemyHealth.RemoveHealth` was found under `Assets/Scripts/Game` (grep), so this is not live as far as the search shows. Fix if ever used: test `<= 0`.

## 5. Five-minute look test (Dom, on a 375-wide phone)

Build a hit ladder in the Pit: one dummy target, four hits at damage 4, 8, 12 and 20, run against two weights (100 and 350). Show three presentation sets and let Dom tap between them:

- A: donor set (sound, blood, knock; no stop, no shake; player red flash only).
- B: A plus a 70 ms hit-stop on attacker and target and a 3 px shake for 120 ms.
- C: B plus a 0.35 alpha player flash for 180 ms and a short player knock.

Dom judges: does the damage 4 hit read as a tap, given the 15 floor makes it push the same as damage 8; does the heavy weight feel heavy; does the hit-stop help or muddy the three-on-one fight. The result tells us whether to lower the floor, not whether the donor's code is right.

## 6. Licence and IP

MIT code. The code may be adapted if the copyright notice is kept (two holders are named in the repo, both MIT). We recommend clean-room: write our own function from the closed form above rather than copy the files. No art, sound clips or sprites are in the box, so none is reused. Concept only for the sound and blood: "a five-variant hit clip and a 10 fps billboard", with our own files.

## 7. Gaps

Not read: `DaggerfallMissile.cs` (spell impacts), `PlayerDeath.cs` and respawn, the body of `EvaluateMoveInForAttack`, the bodies of `AdjustWeaponAttackDamage` and `GetMeleeWeaponAnimTime`, `PlayerSpeedChanger.classicToUnitySpeedUnitRatio` (value), `GameManager.classicUpdateInterval` (value), the second blood method in `EnemyBlood.cs` (line 52), the hit-sound clip contents (data pack, not in box), `EnemyEntity` death threshold in `DecreaseHealth`.
Half read: client only. Server half: not applicable (single-player). Data-pack half: not in box, not read.

Where seen (other than the topic): idle and move frame rates come from the DC016 catalogue (move 6 fps, attack 10 fps, hurt 4 fps, idle 4 fps); not re-read here. Death: corpse marker with the victim's items moved to it, body-fall clip, no freeze (EnemyDeath.cs 96-128). Falling damage (5 HP per metre above a threshold) also shows blood at the centre of mass (`EnemyMotor.cs` 1388, 1406), so one blood effect serves two events. Readability at 375 wide: the red flash covers the full screen; enemies have no threat colour; max enemies per frame not read.

Reuse tag: adapt-idea (MIT; clean-room preferred).
Brief rule served: ordered feedback (one hit frame, fixed order) and numbers as data fields (knock min, max, decay, weight bases).
Decision: adapt (idea), guard precedence and arithmetic fixed in the sketch.
Checked line: 5 or more candidate files opened (WeaponManager, EnemySounds, EnemyAttack, EnemyMotor, ShowPlayerDamage, EnemyBlood, EnemyDeath, FormulaHelper, FPSWeapon); receipts in `receipts.tsv` (56 rows, all verified by `verify_receipts.py`).
