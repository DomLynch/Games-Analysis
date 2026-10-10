# OpenXcom-OpenXcom (vfx-blood-finishers, cell 13)

Donor: `/mnt/frankendom-donors/OpenXcom-OpenXcom/src/Savegame/BattleUnit.cpp` | Licence: GPL-3.0-or-later (`LICENSE.txt` is GNU GPL version 3, 29 June 2007; the file header of Explosion.cpp says "either version 3 of the License, or (at your option) any later version") | C++ | symbol `BattleUnit::damage` (wound roll at 1206-1207)

Checked: Cell 13 = category_no in cells-VF004.tsv. Not a camera cell. The hint file (`src/Battlescape/Explosion.cpp`) is thin: it is a frame timer for a hit, a bullet or an explosion sprite (HIT_FRAMES 4, EXPLODE_FRAMES 8, BULLET_FRAMES 10, 24-26; animate at 53-61), with no blood or gore. The real mechanism is the fatal-wound rule in `BattleUnit.cpp`, which is gameplay state, and the note is about that rule. Candidates opened: Explosion.cpp (whole file, 110 lines), BattleUnit.cpp (damage 1096-1225 read in full; 1550-1570, 1620-1625, 1644-1692, 2340-2365, 2535-2537, 3122-3150 read in full; the rest not read), MedikitState.cpp (line 226, grep only; the medikit UI not read), SavedBattleGame.cpp (call sites 851-908, grep only), TileEngine.cpp (wound reads at 1158, 1297, 1401, 2944: grep only, not read), UnitInfoState.cpp (HUD bar, grep only), RNG.h/RNG.cpp (generate, 39-40, RNG.cpp 78-82). Blood, gore, decal, hit-stop and finisher search over `src/`: no visual code for these. Not read: `setFatalShotInfo`, the fire branch (DT_IN) body beyond the wound guard, the medikit UI, the campaign-side wound recovery (BattlescapeGenerator.cpp:696 appears in grep only), and the header default of `prepareNewTurn`. Confidence: high on the damage-to-wound order, the wound roll, the bleed and the three penalties (read and receipted); medium on the per-turn call order, since I saw only the call sites.

## 1. Mechanism

- One function applies every hit: `BattleUnit::damage(relative, power, type, ignoreArmor)` (1096). Order as the code runs:
  (a) the power is scaled by the armour's damage modifier for the damage type, rounded down (1106).
  (b) unless `ignoreArmor`, the hit side and body part are chosen from the hit direction and height: the head if `relative.z >= height`; an arm if the side is left or right and `z > 4`; a leg if the side is left or right and `z <= 4`; front and rear legs pick a random leg (1110-1177). Then armour for that side is subtracted from power (1178). With `ignoreArmor` the side stays front and the part stays torso, and no armour is subtracted (1098-1099).
  (c) if power is above 0, stun damage goes to the stun level only; other damage reduces health by the power (1181-1190).
  (d) for non-fire damage (`type != DT_IN`): conventional weapons can add a random stun (`RNG(0, power/4)`, 1201); then the wound roll. If the unit is woundable and `RNG(0, 10) < power`, the struck part gains `RNG(1, 3)` fatal wounds (1206-1207). For woundable units, morale drops by the part's total wounds on every hit to that part (1209-1210). Armour on that side drops by `power/10 + 1` (1213), for every non-fire hit that is not stun-only.
- Wounds per part: six body parts (head, torso, left and right arm, left and right leg), summed for `getFatalWounds` (1620-1625).
- Bleed: each turn, health falls by the total of all wounds (1686). The block sits after an early return when `fullProcess` is off (1675-1679). Fire damage is in the same block. Health is then floored at 0 (1695-1696), and an AI state is cleared when health is 0 (1698-1699).
- Penalties, read and receipted:
  - firing accuracy: `max(10, 25 * health / maxHealth + 75 - 10 * wounds)`, where `wounds` is the head plus the arm that holds the weapon (both arms for a two-handed weapon) (1550-1570). At full health the base is 100, and each wound takes 10 points off.
  - time units per turn: each leg wound removes 10 percent of the base recovery; both legs are summed (3132).
  - energy per turn: each torso wound removes 10 percent of current energy from the recovery, then energy is clamped to 0..stamina (3148-3149).
- Heal: a medical item calls `heal(part, woundAmount, healthAmount)` on one part (MedikitState.cpp 226). It lowers that part's wounds by `woundAmount` (floor 0) and adds `healthAmount` to health, capped at the base (2350-2366).
- Who can be wounded: `isWoundable()` is true for type `SOLDIER`, and for aliens only when the bleeding option is on and the unit is a non-player one-tile unit (2535-2537).
- Stun is separate: stun damage never reduces health or adds wounds (the stun branch is `_stunlevel += power` at 1183-1185).

## 2. Key functions

- `BattleUnit::damage`: `/mnt/frankendom-donors/OpenXcom-OpenXcom/src/Savegame/BattleUnit.cpp` 1096-1225. The whole pipeline in section 1.
- Wound roll and morale: same file, 1206-1210. The roll is inside the health branch and is skipped for fire.
- `getAccuracyModifier`: same file, 1548-1571. Head and weapon-arm wounds into the accuracy modifier.
- `getFatalWounds`: same file, 1620-1625. Sum over six parts.
- `prepareNewTurn`: same file, 1644 (the bleed at 1686, after the early return at 1675). Called from `SavedBattleGame.cpp` 908 (grep).
- `heal`: same file, 2350-2366. The medikit path.
- `recoverTimeUnits`: same file, 3122-3132 (leg penalty) and 3148-3149 (torso penalty).
- `isWoundable`: same file, 2535-2537.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Wound roll: chance grows with the hit's power after armour | Roll 0..10 inclusive (1206). Chance = min(power, 11) / 11 (inferred from the range, not separately measured) |
| Wounds per wounding hit | 1 to 3 (1207) |
| Morale loss per wound on the part | 1 per wound, on each hit to that part while it has wounds (1210) |
| Armour loss per hit | power / 10 + 1 (1213) |
| Bleed: health loss per turn equals total wounds | 1 health per wound per turn (1686) |
| Accuracy: base from health fraction, minus per-wound penalty, with a floor | 25 * health / max + 75; minus 10 per wound; floor 10 (1570) |
| Leg penalty on the recovery | 10 percent of base per leg wound (3132) |
| Torso penalty on energy recovery | 10 percent of current energy per torso wound (3148) |
| Heal: wounds down, health up, both bounded | Amounts from the medikit item rule (226); caps at 0 and at base health (2357-2366) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor order for a hit (armour already removed by the caller, health reduced, then the wound roll and the morale loss) and the three penalties and the heal. It leaves out the hit-location code (the side and body-part choice, 1116-1177), the armour subtraction and armour loss (1178, 1213), the stun level and the stun extra, the fire branch, `ignoreArmor`, the `setFatalShotInfo` call, the `isWoundable` type check (passed in as a flag), the fire damage in the bleed, the RNG's modulo method (the caller supplies `rng.int`), and the morale clamp. The donor floors health at 0 after the bleed (1695-1696), and the sketch does the same. `export {}` is appended only for the typecheck. Typecheck: `tsc --noEmit --strict --target es2020` passed on the VPS.

```ts
// Licence: GPL-3.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
type Part = 'head' | 'torso' | 'leftArm' | 'rightArm' | 'leftLeg' | 'rightLeg';

interface Fighter {
  health: number;
  maxHealth: number;
  energy: number;
  wounds: Record<Part, number>;   // fatal wounds per body part
  woundable: boolean;             // only some unit types can be wounded
  morale: number;
}

interface RollSource {
  int(min: number, max: number): number;   // inclusive on both ends, as the donor's RNG
}

// A hit that has already had armour subtracted. Returns the health lost.
function takeHit(f: Fighter, part: Part, power: number, rng: RollSource): number {
  if (power <= 0) return 0;
  f.health -= power;
  if (f.health < 0) f.health = 0;
  // chance to wound: a roll of 0..10 below the power (power 11 or more always wounds)
  if (f.woundable && rng.int(0, 10) < power) {
    f.wounds[part] += rng.int(1, 3);
  }
  // morale drops by the wounds the part carries
  if (f.wounds[part] > 0) f.morale -= f.wounds[part];
  return power;
}

// Each round: health falls by the total wound count.
function bleedRound(f: Fighter): void {
  const total = Object.values(f.wounds).reduce((a, b) => a + b, 0);
  f.health = Math.max(0, f.health - total);
}

// Firing accuracy: base from health, minus 10 per wound on the head and the weapon arm(s).
function accuracy(f: Fighter, weaponArm: 'leftArm' | 'rightArm', twoHanded: boolean): number {
  let wounds = f.wounds.head;
  wounds += twoHanded ? f.wounds.rightArm + f.wounds.leftArm : f.wounds[weaponArm];
  return Math.max(10, Math.trunc((25 * f.health) / f.maxHealth) + 75 - 10 * wounds);
}

// Time units recovered per turn: each leg wound removes 10 percent of the recovery.
function tuRecovery(base: number, f: Fighter): number {
  const legs = f.wounds.leftLeg + f.wounds.rightLeg;
  return base - Math.trunc((base * (legs * 10)) / 100);
}

// Energy recovered per turn: each torso wound removes 10 percent of current energy from the recovery.
function energyRecovery(f: Fighter, base: number, cap: number): number {
  const loss = Math.trunc((f.energy * (f.wounds.torso * 10)) / 100);
  return Math.max(0, Math.min(cap, f.energy + (base - loss)));
}

// A medical item heals one part's wounds and adds health (capped at max).
function heal(f: Fighter, part: Part, woundAmount: number, healthAmount: number): void {
  if (f.wounds[part] === 0) return;
  f.wounds[part] = Math.max(0, f.wounds[part] - woundAmount);
  f.health = Math.min(f.maxHealth, f.health + healthAmount);
}
```

## 5. Lands in

- TARGET `src/fight/wounds.ts` (new, proposed): the engine's wound state and its four rules (the hit roll, the bleed, the accuracy and recovery penalties, and the heal). It is engine state, so it goes through the one ledger; it is not a client effect.
- Parity-checklist row: 8 (blood/wounds/decals). The wound state is the part of row 8 that the engine owns. The blood and decal visuals are not in this donor, so the client half of row 8 has nothing to take from it.
- today: the current Frankendom damage and wound code was not read in this pass.
- Reuse tag: rewrite-from-idea (GPL-3.0-or-later; clean-room only)
- Brief rule served: one ledger (every wound change goes through one function in the engine) and server-verified outcomes (the bleed that kills is a server-verified kill).

Best transferable idea: A hit that gets through armour can add one to three wounds to the struck body part, with a chance that grows with the hit's power; those wounds bleed health every round and lower accuracy, leg time-units and torso energy recovery until healed.
Decision (proposed): adapt — the per-part wound counter and the per-round bleed give a gladiator fight a lasting cost, but the donor's numbers are turn-based and the donor keeps wounds in the battle save only, so Frankendom must decide the round rate, the cap and whether wounds carry between bouts before it adopts them.
Acceptance: After a heavy hit to the arm, that arm shows a wound on the fighter's HUD, the fighter's next swings are less accurate, and health falls by the wound count each round; a server test asserts the wound roll for a fixed seed and that a heal item reduces only the chosen part's wounds.

## 6. Gaps and risks

- No visual half. The donor has no blood, decal or gore code; its only wound visual is a HUD bar (UnitInfoState.cpp 83-85 and 182-184, grep only). Row 8's client part gets nothing from here.
- Persistence is undecided. The donor saves wounds inside the battle (`fatalWounds`, BattleUnit.cpp 334 and 402). A campaign-side recovery time exists (BattlescapeGenerator.cpp 696, grep only, not read). Frankendom needs a ruling on whether wounds carry between bouts or are cleared at the end of a bout.
- Bleed and death. The bleed is health minus total wounds (1686), then health is floored at 0 (1695-1696) and the unit's AI state is cleared at 0. Frankendom's kills are server-verified, so a bleed-out must be a server kill through the same rule, not a client death.
- Random source. The donor uses its own RNG (RNG.h 39-40, inclusive). Frankendom needs the wound roll to come from the server's seeded roll, so a replay of the same hits gives the same wounds.
- Many-on-one. Wounds attach to the struck part of one fighter. With MAX_ATTACKERS = 3, one fighter can take several wounding hits in one round; each adds to the part total, which then drives the bleed and the penalties. Test the round with three hits from three attackers.
- Item data, not zone data. The heal amounts come from the medical item (MedikitState.cpp 226), so they are catalogue data. The schema's `where` values have no item option, so the heal fields are marked engine constant here; move them to the catalogue when the data is written.
- Alien bleeding is a setting (`Options::alienBleeding`, 2537). Frankendom should make "can be wounded" a per-unit-type rule in data, not a global option.
- Licence: GPL-3.0-or-later. Clean-room only: the sketch was written from the mechanism.
