# ryzom-ryzomcore (pets-mounts-taming, cell 1)

Donor: `/mnt/frankendom-donors/ryzom-ryzomcore/ryzom/server/src/entities_game_service/player_manager/character.cpp` | Licence: AGPL-3.0 (`COPYING` and `LICENSE` are GNU AGPL v3; header of `ryzom/server/src/server_share/taming_tool_type.h` says "version 3 ... or any later version") | C++ | symbol `CCharacter::updatePetCoordinateAndDatabase`

Checked: Read in full: `updatePetCoordinateAndDatabase` (character.cpp 6385-6462), `onAnimalHungry` (5897-5971), `updateAnimalHungerDb` (5851-5868), `checkAnimalInRange` (5977-5993), `setAnimalSatiety` (5998-6020), `mount` (2063-2130 read; the rest of the function from 2130 to 2170 is the abort branch), `unmount` (2195-2247). Read in part: the tickUpdate call site (1009-1013, 1340-1350). Constants: `egs_variables.cpp` 554-564 (`AnimalHungerFactor`, `AnimalStopFollowingDistance`), `character.h` 114, `tick_event_handler.cpp` 41 (default game step 0.1 s), `character_tick_update_timer_event.cpp` 37-43. Not read: the normal return value of `tickUpdate` (so the 16-cycle interval rests on the arm at 597 and the re-arm at 1593, not on the return value), `getWalkSpeed` and `getRunSpeed` values in the creature sheets, the client effect of the speed flag (the donor pushes it to the mirror as `DSPropertyFUEL`, 5967-5968), `stable.cpp`, the taming check (the only taming code I found is the item family and its fields at `egs_static_game_item.cpp` 732-761, read by grep only), summon rules (`admin.cpp` 2914, not read), the live shard game step (default 0.1 s used). Confidence: high on the code path and the arithmetic in section 3; moderate on the interval, which assumes the default step. camera_scope: n/a (not a camera topic).

Best transferable idea: a mount's food meter drains only for distance travelled above its walk speed (per-metre rate from the creature row), clamps at zero, and at zero flips one speed flag that slows the mount until it is fed.
Decision (proposed): adapt - a travel-fatigue meter for a mount or summoned companion in open zones fits zones-as-data and server state; the donor's food loop, unit mismatch and AND gate must not be copied, and the duel and Pit do not need it.
Acceptance: In an open zone, a mount run 500 m above walk speed (server test) drains the meter by 500 x the row's per-metre rate, and at zero the server reports run speed capped to walk; a unit test asserts that a 20 mm move along one axis only is charged.

## 1. Mechanism

- Driver: the character tick. `tickUpdate` (1009) calls `updatePetCoordinateAndDatabase()` (1349). The tick timer is armed with `CharacterTickUpdatePeriodGc` (597; constant 16 at `character.h:114`) and re-armed by the timer event with the value `tickUpdate` returns (`character_tick_update_timer_event.cpp:41-42`). Pets are therefore sampled once per 16 game cycles, not every cycle (the comment at 6401 says so). At the default game step of 0.1 s (`tick_event_handler.cpp:41`) that is 1.6 s per sample.
- Order of steps for each pet that is out in the landscape (PetStatus landscape, creature exists):
  (a) If the pet has food left (Satiety > 0) and it has a previous sample (not the 0,0 init): take the absolute change in X and Y since the last stored position, in mm (6406-6407).
  (b) Move threshold: only if BOTH axes changed by more than 10 mm (6408). Speed = straight-line distance over (step x 16 cycles), in mm/s, converted to m/s (6413, 6415 `* 0.001f`).
  (c) Excess = speed minus the creature's current walk speed (6415). Only a positive excess costs food (6416).
  (d) Satiety -= excess x AnimalHungerFactor x 16 cycles (6419-6420).
  (e) If Satiety has reached 0: clamp to 0 and call `onAnimalHungry(i, true)` (6424-6427), which sends "hungry" and sets the speed flag.
  (f) Leash: `checkAnimalInRange` runs here, still inside the moving branch (6432). It reads the previous stored position against the owner's current position, and if the squared distance is over 100 m squared it sends STAND and stops the follow (5977-5993).
  (g) If Satiety is already 0 (the else branch, 6436-6442): call `onAnimalHungry(i, false)`, which eats food from the pet's own inventory unit by unit until full, then sets the speed flag to Satiety > 0 (5897-5971). Then the leash check runs again (6442).
  (h) Store the new position (6446-6448) and check for death (6451-6461).
- Mount side (`mount`, 2063): refuses while invisible; needs a mountable form (2077) and no rider (2079); needs the rider within the mount distance (2089). It sets the rider, sets IsMounted, copies the creature's walk and run speed into the player (2124-2125), and makes the mount unmountable while ridden (2127). `unmount` (2195) sets the player back to a fixed 1.3 walk and 6.0 run (2214-2215), makes the mount mountable again (2209) and clears IsMounted.

## 2. Key functions

- `CCharacter::updatePetCoordinateAndDatabase`: `/mnt/frankendom-donors/ryzom-ryzomcore/ryzom/server/src/entities_game_service/player_manager/character.cpp` 6385-6462. The whole hunger step: sample, drain, hungry handler, leash, store.
- `CCharacter::onAnimalHungry`: `character.cpp` 5897-5971. Feeding from the pet inventory and the speed flag.
- `CCharacter::checkAnimalInRange`: `character.cpp` 5977-5993. Leash stop at 100 m.
- `CCharacter::setAnimalSatiety`: `character.cpp` 5998-6020. Clamp to 0..MaxSatiety and push the speed flag to the mirror.
- `CCharacter::mount` and `CCharacter::unmount`: `character.cpp` 2063-2130 and 2195-2247.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Sample position every N ticks; speed = distance / elapsed | N = 16 cycles (`character.h:114`); step 0.1 s by default (`tick_event_handler.cpp:41`) |
| Move threshold on a noisy position | 10 mm, both axes (`character.cpp:6408`, AND, see defect 1) |
| Drain only the part above the walk speed | excess = speed - `CurrentWalkSpeed` (`character.cpp:6415`) |
| Food meter, clamped at 0 and at max | MaxSatiety from the form (`PetHungerCount`, `character.cpp:2989`, grep only); example 1000 (`egs_variables.cpp:560` comment) |
| Hungry flag flips a speed cap | flag = Satiety > 0 (`character.cpp:5968`) |
| Leash: stop follow past a distance | 100 m, a global `CVariable` default (`egs_variables.cpp:563-564`) |
| Dismount resets to a base speed | 1.3 walk, 6.0 run, fixed in code (`character.cpp:2214-2215`) |

Formula and number ranges (table rows, file:line):

| Quantity | Formula as coded | Value | file:line |
|---|---|---|---|
| Factor F | `1000*9 / (7680*(9-4.5)*0.1)` | 2.604 | egs_variables.cpp:560 |
| Drain per sample | `(v - w) * F * 16` | 187.5 at v 9, w 4.5 | character.cpp:6419 |
| Distance per sample | `v * 0.1 * 16` | 14.4 m at 9 m/s | character.cpp:6413, character.h:114 |
| Samples to empty from 1000 | `1000 / 187.5` | 5.3 samples = 76.8 m | derived from the two rows above |
| Distance the comment promises | comment example | 7680 m | egs_variables.cpp:560 |
| Leash | `dist^2 > 100^2` (m) | 100 m | egs_variables.cpp:564, character.cpp:5987 |
| Dismount speeds | constants | walk 1.3, run 6.0 | character.cpp:2214-2215 |

The 76.8 m row is the donor's own example run through its code path. The donor comment promises 7680 m for the same numbers, so the code is 100 times more hungry than its comment (defect 2).

## 4. TypeScript sketch

simplified: the sketch runs the leash test before the drain on every sample; the donor runs the drain (6419-6420) and then the leash (6432), inside the moving branch, and also in the hungry branch (6442). The two steps do not share state (the leash reads only the previous position and the drain touches only satiety), so the order does not change the result. It uses the form's walk speed where the donor reads the creature's `CurrentWalkSpeed`, and takes the sample period in seconds as a parameter instead of game cycles. It omits the hungry message, the database and mirror export (`setProp`, 6016), the death check (6451), the 0,0 init guard (6410), the per-form lookups, and the donor's food-unit bookkeeping (the loop of units until full is the same as the donor's partial-unit arithmetic at 5930-5940).

```ts
// Licence: AGPL-3.0 (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
interface MountAnimal {
  satiety: number;      // 0 .. maxSatiety; 0 means hungry (mount slowed)
  maxSatiety: number;   // from the pet form (donor field PetHungerCount)
  lastX: number;        // mm, position at the previous sample
  lastY: number;
  hasLast: boolean;
  following: boolean;
}

interface MountForm {
  walkMs: number;                // walk speed, m/s (creature form)
  drainPerMetreOverWalk: number; // satiety lost per metre travelled above walk speed (catalogue data, not a code constant)
}

interface HungerStep { justHungry: boolean; freeSpeed: boolean; stopFollow: boolean; }

const MIN_MOVE_MM = 10;   // donor threshold, applied to the straight-line move
const LEASH_M = 100;      // donor AnimalStopFollowingDistance

// One update of the mount. Called on a fixed interval (dtS seconds).
function hungerSample(m: MountAnimal, form: MountForm, x: number, y: number, ownerX: number, ownerY: number, dtS: number): HungerStep {
  // Leash first, against the previous sample (donor checkAnimalInRange runs before the position store).
  let stopFollow = false;
  if (m.following) {
    const dxm = (m.lastX - ownerX) / 1000;
    const dym = (m.lastY - ownerY) / 1000;
    if (dxm * dxm + dym * dym > LEASH_M * LEASH_M) { m.following = false; stopFollow = true; }
  }

  let justHungry = false;
  if (m.hasLast && m.satiety > 0) {
    const moveMm = Math.hypot(x - m.lastX, y - m.lastY);
    if (moveMm > MIN_MOVE_MM) {
      const movedM = moveMm / 1000;
      const excessM = Math.max(0, movedM - form.walkMs * dtS); // only distance above walk speed costs food
      m.satiety = Math.max(0, m.satiety - excessM * form.drainPerMetreOverWalk);
      if (m.satiety === 0) justHungry = true;
    }
  }

  m.lastX = x; m.lastY = y; m.hasLast = true;
  return { justHungry, freeSpeed: m.satiety > 0, stopFollow };
}

// Feeding while hungry: each food unit adds calories until full. Returns how many units to remove from the stack.
function feed(m: MountAnimal, caloriesPerUnit: number, unitsAvailable: number): number {
  let used = 0;
  while (used < unitsAvailable && m.satiety < m.maxSatiety) {
    m.satiety = Math.min(m.maxSatiety, m.satiety + caloriesPerUnit);
    used++;
  }
  return used;
}
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS (`/tmp/ryzom-mount-hunger.ts` with `export {}` appended) exits 0.

## 5. Lands in

- TARGET `origins/server/mounts.ts` (new module, proposed): the hunger and speed-flag step for a mount or companion in open zones, run from the server world tick. Not in the duel. Parity-checklist row 21 (catalogue fields: MaxSatiety, drain per metre, walk and run speeds, food calories), with the tick placement under the server-tick sub-line "server tick: fixed step, input intake, per-tick NPC budget" (row 18 / post-K item 3).
- Reuse tag: rewrite-from-idea (AGPL-3.0; clean-room only)
- Brief rule served: 1 (one engine: the meter is server state; the client only shows it). Zones as data for the per-form numbers.

## 6. Gaps and risks

- AGPL-3.0: clean-room, shape only. The sketch is written from the mechanism.
- Defect 1, the AND gate (`character.cpp:6408`): a pet that moves only along one axis by more than 10 mm is not charged and not leashed. Fix: use the straight-line distance and test that instead.
- Defect 2, units (`egs_variables.cpp:555-560` against `character.cpp:6413-6419`): the comment says the factor is per tick per m/tick at a 0.1 s tick, but the code multiplies by 16 cycles and never converts speed to per-tick metres. With the donor's own example (1000 satiety, 9 and 4.5 m/s), the bar empties after 76.8 m, not 7680 m. Fix: store one per-metre rate per creature row, charge distance above walk speed directly (as in the sketch), and add a test that asserts the arithmetic; no time factor.
- Defect 3, step dependence: the cost per metre works out to F x (v - w) / (v x step), because the drain per sample is fixed at 16 cycles while the distance per sample grows with the step. A change of game step therefore changes the cost per metre. Fix: drain by distance, not by speed x time (the sketch does).
- Food loop: `onAnimalHungry` removes food units from the pet's inventory every sample while hungry (5914-5959). Frankendom needs this to go through the one ledger, with the item removal logged once.
- Frankendom rulings: the duel does not use mounts, so this is travel only; the Pit is a client and needs none of it (row 22). MAX_ATTACKERS = 3 does not apply. Hunger must be server-side; the donor pushes the speed flag to the client (`DSPropertyFUEL`, 5967-5968), which we would do as a state field only.
- Not verified: the taming check, stabling and summon rules are not in this note; the donor's stable file (`entities_game_service/stables/stable.cpp`) was not read.
